import React from 'react';
import { apiBase } from '@kd/catalog';
import './live-try-on.css';
const API = import.meta.env.VITE_API_URL || apiBase;
import { useCallback, useEffect, useRef, useState } from 'react';
const samples = [
    { name: 'Charcoal outerwear', image: '/garments/sample-2.png' },
    { name: 'Statement knitwear', image: '/garments/sample-3.png' },
    { name: 'The light layer', image: '/garments/sample-4.png' },
];
const prompt = 'Dress the person in the garment from the reference image. Preserve the person and background.';
function providerError(error) {
    const code = typeof error?.code === 'string' ? error.code.replace(/[^A-Z0-9_]/g, '').slice(0, 60) : '';
    const message = typeof error?.message === 'string' ? error.message.replace(/(?:dct_|ek_)[A-Za-z0-9._-]+/g, '[redacted]').slice(0, 300) : 'Could not start the AI session.';
    return code ? `${message} (${code})` : message;
}
const reference = (image) => typeof image === 'string' ? new URL(image, location.origin).href : image;
const loadDecart = () => import('@decartai/sdk');
export default function LiveTryOn({ token, initialGarment, loadSdk = loadDecart }) {
    const [hasError, setHasError] = useState(false);
    const pendingConnect = useRef(false), tokenRequest = useRef(null);
    const [configured, setConfigured] = useState(null);
    const [status, setStatus] = useState('Checking the AI connection…');
    const [phase, setPhase] = useState('idle');
    const [consent, setConsent] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const [remaining, setRemaining] = useState(30);
    const [sessionSeconds, setSessionSeconds] = useState(30);
    const [streamReceived, setStreamReceived] = useState(false);
    const [playbackReady, setPlaybackReady] = useState(false);
    const [connectionNote, setConnectionNote] = useState('Not connected');
    const [capacityWait, setCapacityWait] = useState(null);
    const [sdkVideoFps, setSdkVideoFps] = useState(null);
    const [networkQuality, setNetworkQuality] = useState('Not reported');
    const [garment, setGarment] = useState(initialGarment ? { ...initialGarment, preview: initialGarment.image } : { ...samples[0], preview: samples[0].image });
    const localVideo = useRef(null), remoteVideo = useRef(null);
    const session = useRef(null), camera = useRef(null);
    const generation = useRef(0), active = useRef(false), objectURL = useRef(null);
    const timer = useRef(null);
    const gotStream = useRef(false), videoPlaying = useRef(false);
    const stop = useCallback((message = 'Session stopped. Your camera is off.') => {
        generation.current++;
        active.current = false;
        const old = session.current;
        session.current = null;
        try { old?.disconnect(); } catch {}
        tokenRequest.current?.abort();
        camera.current?.getTracks().forEach(t => t.stop());
        camera.current = null;
        if (localVideo.current)
            localVideo.current.srcObject = null;
        if (remoteVideo.current) {
            remoteVideo.current.srcObject?.getTracks().forEach(t => t.stop());
            remoteVideo.current.srcObject = null;
        }
        if (timer.current)
            clearInterval(timer.current);
        setPhase('idle');
        setSwapping(false);
        setStatus(message);
    }, []);
    async function check() {
        setHasError(false);
        try {
            const response = await fetch(API + '/try-on', { cache: 'no-store', headers: { Authorization: 'Bearer ' + token } });
            const body = await response.json();
            if (!response.ok)
                throw Error(body.error || 'Connection check failed.');
            setConfigured(body.configured === true);
            const duration = Number.isInteger(body.sessionSeconds) && body.sessionSeconds >= 30 && body.sessionSeconds <= 300 ? body.sessionSeconds : 30;
            setSessionSeconds(duration);
            setRemaining(duration);
            setStatus(body.configured ? `API key configured. Ready to start a ${duration}-second trial.` : 'Setup needed: enable try-on and add the Decart API key on the server.');
        }
        catch (e) {
            setConfigured(false);
            setHasError(true);
            setStatus(e instanceof Error ? e.message : 'Could not reach the server.');
        }
    }
    useEffect(() => {
        void check();
        const hide = () => { if (document.hidden && active.current)
            stop('Session stopped because the page is hidden.'); };
        document.addEventListener('visibilitychange', hide);
        const leave = () => stop();
        window.addEventListener('pagehide', leave);
        return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); stop(); if (objectURL.current)
            URL.revokeObjectURL(objectURL.current); };
    }, [stop, token]);
    async function start() {
        if (pendingConnect.current) { setHasError(true); setStatus('The previous connection is closing. Please wait before starting again.'); return; }
        if (active.current || !configured || !consent || document.hidden)
            return;
        const attempt = ++generation.current;
        active.current = true;
        setHasError(false);
        setPhase('starting');
        setStatus('Requesting camera access…');
        setRemaining(sessionSeconds);
        gotStream.current = false;
        videoPlaying.current = false;
        setStreamReceived(false);
        setPlaybackReady(false);
        setConnectionNote('Connecting to Decart');
        setCapacityWait(null);
        setSdkVideoFps(null);
        setNetworkQuality('Not reported');
        try {
            const { createDecartClient, models, noopLogger } = await loadSdk();
            if (attempt !== generation.current)
                return;
            const model = models.realtime('lucy-vton-3.6');
            if (!navigator.mediaDevices?.getUserMedia)
                throw Error('Camera access requires HTTPS or localhost in a supported browser.');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: model.width }, height: { ideal: model.height }, frameRate: model.fps } });
            if (attempt !== generation.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            camera.current = stream;
            setConnectionNote('Camera ready; establishing WebRTC');
            if (localVideo.current)
                localVideo.current.srcObject = stream;
            setStatus('Connecting to Lucy. Your camera preview is shown separately.');
            // Start the local cap before dialing; receiving another stream must not reset it.
            const end = Date.now() + sessionSeconds * 1000;
            timer.current = setInterval(() => {
                const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
                setRemaining(left);
                if (!left) {
                    const reason = !gotStream.current
                        ? 'The session ended before an AI video stream arrived. Check WebRTC connectivity, Decart capacity and model access.'
                        : !videoPlaying.current
                            ? 'AI video reached the browser but playback never started. Check browser video errors and permissions.'
                            : 'Session time limit reached. Your camera is off.';
                    if (!videoPlaying.current) setHasError(true);
                    stop(reason);
                }
            }, 250);
            tokenRequest.current = new AbortController();
            const signal = tokenRequest.current.signal;
            let credentialPromise;
            pendingConnect.current = true;
            const client = createDecartClient({ telemetry: false, logger: noopLogger, apiKeyProvider: async () => {
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    // Reuse one short-lived credential for image uploads, never mint automatically again.
                    credentialPromise ??= fetch(API + '/try-on', { method: 'POST', signal, headers: { Authorization: 'Bearer ' + token } }).then(async res => { const data = await res.json(); if (!res.ok) throw Error(data.error || 'Could not authorize the AI session.'); return data; });
                    const data = await credentialPromise;
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    if (typeof data.apiKey !== 'string' || !data.apiKey)
                        throw Error('The server returned an invalid session token.');
                    return data.apiKey;
                } });
            const result = await client.realtime.connect(stream, {
                model, mirror: 'auto',
                // Decart's capacity retry is disabled by retries:0. Allow a short,
                // bounded wait rather than failing immediately during peak demand.
                retries: 2, capacityRetryBudgetMs: Math.min(15000, sessionSeconds * 1000 / 2),
                onCapacityWait: ({ retryAfterMs }) => {
                    if (attempt !== generation.current) return;
                    const waitSeconds = Math.max(1, Math.ceil(Number(retryAfterMs || 0) / 1000));
                    setCapacityWait(waitSeconds);
                    setStatus(`Decart is at capacity. Trying again in about ${waitSeconds}s (no queue position is provided).`);
                },
                onConnectionQuality: (report) => {
                    if (attempt !== generation.current) return;
                    if (['good', 'fair', 'poor', 'critical'].includes(report?.quality))
                        setNetworkQuality(report.quality);
                },
                initialState: { prompt: { text: prompt, enhance: false }, image: reference(garment.image) },
                onRemoteStream: (output) => {
                    if (attempt !== generation.current) { output.getTracks().forEach(t => t.stop()); return; }
                    if (!output?.getVideoTracks?.().length) {
                        setHasError(true);
                        setStatus('Decart returned a media stream without a video track.');
                        return;
                    }
                    gotStream.current = true;
                    setStreamReceived(true);
                    setConnectionNote('AI video track received');
                    setStatus('AI video track received. Waiting for browser playback…');
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = output;
                        // An attached MediaStream is not proof that the video is playing.
                        remoteVideo.current.play?.().catch(() => {
                            if (attempt === generation.current && !videoPlaying.current) {
                                setHasError(true);
                                setStatus('AI video arrived, but playback was blocked. Click Play AI video to retry.');
                            }
                        });
                    }
                },
                onConnectionChange: (state) => {
                    if (attempt !== generation.current) return;
                    setConnectionNote(`Provider: ${String(state).slice(0, 50)}`);
                    if (state === 'disconnected' || state === 'reconnecting')
                        stop('Connection ended. Your camera is off. Start a new trial when ready.');
                },
            });
            if (attempt !== generation.current) {
                result.disconnect();
                return;
            }
            session.current = result;
            setCapacityWait(null);
            result.on('stats', (stats) => {
                if (attempt !== generation.current) return;
                const fps = stats?.video?.framesPerSecond;
                if (typeof fps === 'number' && Number.isFinite(fps))
                    setSdkVideoFps(Math.round(fps * 10) / 10);
            });
            result.on('connectionChange', (state) => {
                if (attempt !== generation.current) return;
                setConnectionNote(`WebRTC: ${String(state).slice(0, 50)}`);
                if (state === 'disconnected' || state === 'reconnecting')
                    stop('WebRTC connection was lost. Your camera is off. Try another network or browser.');
            });
            // Only surface diagnostic names, never session IDs, camera frames or credentials.
            result.on('diagnostic', (event) => {
                if (attempt !== generation.current) return;
                const allowed = ['iceStateChange', 'peerConnectionStateChange', 'videoStall', 'selectedCandidatePair'];
                if (allowed.includes(event?.name)) setConnectionNote(`WebRTC diagnostic: ${event.name}`);
            });
            if (!gotStream.current) {
                setStatus('Connected to Decart, waiting for the AI video track…');
            }
            result.on('error', (error) => { if (attempt === generation.current)
                { setHasError(true); stop(providerError(error)); } });
            result.on('sessionEnded', () => { if (attempt === generation.current)
                stop('The provider ended this trial. Your camera is off.'); });
        }
        catch (e) {
            if (attempt !== generation.current)
                return;
            setHasError(true);
            const message = e?.name === 'NotAllowedError' ? 'Camera permission was declined. Allow it in your browser to try again.' : providerError(e);
            stop(message);
        } finally { pendingConnect.current = false; }
    }
    async function choose(next) {
        if (swapping || phase === 'starting')
            return;
        if (session.current) {
            const current = session.current, attempt = generation.current;
            setHasError(false);
            setSwapping(true);
            setStatus('Applying the new garment…');
            try {
                await current.set({ prompt, enhance: false, image: reference(next.image) });
                if (attempt !== generation.current)
                    return;
                setGarment(next);
                setStatus('Garment updated. Live preview is continuing.');
                return true;
            }
            catch {
                if (attempt === generation.current)
                    { setHasError(true); setStatus('Could not change the garment. Your previous selection is kept.'); }
            }
            finally {
                if (attempt === generation.current)
                    setSwapping(false);
            }
        }
        else { setGarment(next); setHasError(false); return true; }
    }
    async function upload(file) {
        if (!file)
            return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setHasError(true);
            setStatus('Choose a JPG, PNG or WebP garment photo smaller than 5 MB.');
            return;
        }
        const preview = URL.createObjectURL(file);
        if (await choose({ name: 'Your garment', image: file, preview })) {
            if (objectURL.current) URL.revokeObjectURL(objectURL.current);
            objectURL.current = preview;
        } else URL.revokeObjectURL(preview);
    }
    return <div className="kd-live-demo">
        <header><a className="brand" href="/shop">KD <span>DESIGN</span></a><nav>LIVE FITTING ROOM</nav><a className="back" href="/shop">Back to shop</a></header>
        <main>
            <div className="intro"><div><div className="eyebrow">POWERED BY DECART LUCY</div><h1>See it on you.</h1><p>A live fitting room, with room to experiment.</p></div><span className="demo-label">SESSION LIMIT: {sessionSeconds}s</span></div>
            <section className="live-layout">
                <div className="video-area">
                    <div className="output">
                        <video ref={remoteVideo} autoPlay playsInline muted aria-label="AI try-on"
                            onPlaying={() => {
                                if (!active.current || !gotStream.current) return;
                                videoPlaying.current = true;
                                setPlaybackReady(true);
                                setPhase('live');
                                setHasError(false);
                                setStatus('Live AI preview. Change a garment below or stop at any time.');
                            }}
                            onError={() => {
                                if (active.current && gotStream.current) {
                                    setHasError(true);
                                    setStatus('The browser could not decode or play the AI video track.');
                                }
                            }}/>
                        <div className="video-label">AI try-on {phase !== 'idle' && `/ ${remaining}s`}</div>
                        {phase !== 'live' && <div className="video-placeholder"><h2>{phase === 'starting' ? 'Preparing your look.' : 'Your look comes to life here.'}</h2><p>{phase === 'starting' ? 'Connecting to the AI video stream.' : 'Choose a garment, then start your trial.'}</p></div>}
                    </div>
                    <div className="camera-preview"><video ref={localVideo} autoPlay playsInline muted aria-label="Original camera"/><span>Original camera / No AI</span></div>
                </div>
                <aside className="session-panel">
                    <div className="eyebrow">YOUR SELECTED PIECE</div><img className="selected-garment" src={garment.preview} alt={garment.name}/><h2>{garment.name}</h2>
                    <p className={'live-status'+(hasError?' is-error':'')} role={hasError?'alert':'status'} aria-live="polite">{status}</p>
                    {configured === false && <div className="setup-note"><strong>Setup or account access needed</strong><p>Sign in and ask the shop administrator to enable this demo. The API key belongs in server settings only.</p><a href="https://platform.decart.ai" target="_blank" rel="noopener noreferrer">Decart Platform</a><button className="outline full" onClick={check}>Check connection again</button></div>}
                    <label className="consent"><input type="checkbox" checked={consent} disabled={phase !== 'idle'} onChange={e=>setConsent(e.target.checked)}/><span>I agree to send my camera video and garment image to Decart for this trial. API credits may be used. <a href="https://docs.platform.decart.ai/resources/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy information</a></span></label>
                    <details className="try-on-diagnostics">
                        <summary>Connection diagnostics</summary>
                        <p>Camera: {camera.current?.getVideoTracks?.()[0]?.readyState === 'live' ? 'Live' : 'Off'}</p>
                        <p>AI video track: {streamReceived ? 'Received' : 'Not received'}</p>
                        <p>Video playback: {playbackReady ? 'Playing' : 'Not confirmed'}</p>
                        <p>Connection: {connectionNote}</p>
                        <p>Decart capacity wait: {capacityWait === null ? 'None reported' : `Retrying in ~${capacityWait}s`}</p>
                        <p>SDK video FPS: {sdkVideoFps === null ? 'Not reported' : sdkVideoFps}</p>
                        <p>Network quality: {networkQuality}</p>
                        <small>No credentials, camera images or session identifiers are displayed.</small>
                    </details>
                    {streamReceived && !playbackReady && <button className="outline full" onClick={() => {
                        remoteVideo.current?.play?.().catch(() => {
                            setHasError(true);
                            setStatus('Your browser still cannot play the AI stream. Check autoplay restrictions and video format.');
                        });
                    }}>Play AI video</button>}
                    <button className="primary full" disabled={!configured || !consent || phase !== 'idle'} onClick={start}>{phase === 'idle' ? `Start ${sessionSeconds}-second try-on` : 'Session in progress'}</button>
                    <button className="outline full stop" disabled={phase === 'idle'} onClick={()=>{setHasError(false);stop();}}>Stop &amp; turn camera off</button><p className="micro">No microphone. Stops when you leave this tab.</p>
                </aside>
            </section>
            <section><div className="sample-head"><h2>Change your look.</h2><p>Anywear samples / Not KD Design products</p></div>
                <div className="live-samples">
                    {(initialGarment?[initialGarment,...samples]:samples).map((item,index)=><button key={index} disabled={phase === 'starting' || swapping} className={garment.image === item.image?'chosen':''} aria-pressed={garment.image === item.image} onClick={()=>choose({...item,preview:item.image})}><img src={item.image} alt={item.name} loading="lazy"/><span>{item.name}</span></button>)}
                    <label className="upload-garment"><strong>Try your own garment</strong><small>JPG, PNG or WebP / Up to 5 MB</small><input aria-label="Upload garment" type="file" accept="image/jpeg,image/png,image/webp" disabled={phase === 'starting' || swapping} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>
                </div>
            </section>
            <aside className="help">Stand in even light and keep your upper body visible. This AI preview does not measure your size or guarantee physical fit.</aside>
        </main>
    </div>;
}
