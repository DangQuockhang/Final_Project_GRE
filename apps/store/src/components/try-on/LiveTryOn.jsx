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
    const receivedFrames = useRef(false);
    const [cooldown, setCooldown] = useState(0);
    const cooldownUntil = useRef(0);
    const [hasError, setHasError] = useState(false);
    const pendingConnect = useRef(false), tokenRequest = useRef(null);
    const [configured, setConfigured] = useState(null);
    const [status, setStatus] = useState('Checking the AI connectionâ€¦');
    const [phase, setPhase] = useState('idle');
    const [consent, setConsent] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const [remaining, setRemaining] = useState(30);
    const [garment, setGarment] = useState(initialGarment ? { ...initialGarment, preview: initialGarment.image } : { ...samples[0], preview: samples[0].image });
    const localVideo = useRef(null), remoteVideo = useRef(null);
    const session = useRef(null), camera = useRef(null);
    const generation = useRef(0), active = useRef(false), objectURL = useRef(null);
    const timer = useRef(null);
    useEffect(() => {
        const tick = setInterval(() => setCooldown(Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000))), 250);
        return () => clearInterval(tick);
    }, []);
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
            setStatus(body.configured ? 'API key configured. Ready to start a 30-second trial.' : 'Setup needed: enable try-on and add the Decart API key on the server.');
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
        if (Date.now() < cooldownUntil.current || active.current || !configured || !consent || document.hidden)
            return;
        const attempt = ++generation.current;
        active.current = true;
        receivedFrames.current = false;
        setHasError(false);
        setPhase('starting');
        setStatus('Requesting camera accessâ€¦');
        setRemaining(30);
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
            if (localVideo.current)
                localVideo.current.srcObject = stream;
            setStatus('Connecting to Lucy. Your camera preview is shown separately.');
            // Start the local cap before dialing; receiving another stream must not reset it.
            const end = Date.now() + 30000;
            timer.current = setInterval(() => { const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setRemaining(left); if (!left) { const shown = receivedFrames.current; setHasError(!shown); stop(shown ? '30-second trial complete. Your camera is off.' : 'No playable AI video arrived within 30 seconds. The session and camera have stopped. Check your network or Decart service status before trying again.'); } }, 250);
            tokenRequest.current = new AbortController();
            const signal = tokenRequest.current.signal;
            let credentialPromise;
            pendingConnect.current = true;
            const client = createDecartClient({ telemetry: false, logger: noopLogger, apiKeyProvider: async () => {
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    // Reuse one short-lived credential for image uploads, never mint automatically again.
                    credentialPromise ??= fetch(API + '/try-on', { method: 'POST', signal, headers: { Authorization: 'Bearer ' + token } }).then(async res => { const data = await res.json(); if (res.status === 429 || res.ok) { const seconds = res.ok ? 30 : Math.min(300, Math.max(1, Number(data.retryAfterSeconds) || 30)); cooldownUntil.current = Date.now() + seconds * 1000; setCooldown(seconds); } if (!res.ok) throw Error(data.error || 'Could not authorize the AI session.'); return data; });
                    const data = await credentialPromise;
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    if (typeof data.apiKey !== 'string' || !data.apiKey)
                        throw Error('The server returned an invalid session token.');
                    return data.apiKey;
                } });
            const result = await client.realtime.connect(stream, {
                model, mirror: 'auto', retries: 0, capacityRetryBudgetMs: 0,
                initialState: { prompt: { text: prompt, enhance: false }, image: reference(garment.image) },
                onRemoteStream: (output) => {
                    if (attempt !== generation.current) { output.getTracks().forEach(t => t.stop()); return; }
                    const video = remoteVideo.current;
                    if (!video) return;
                    video.srcObject = output;
                    setStatus('AI stream received. Waiting for playable video.');
                    // A remote track can exist before any frame arrives. Do not report success yet.
                    void video.play().catch(() => {
                        if (attempt === generation.current) {
                            setHasError(true);
                            stop('The browser could not play the AI video. Please check browser media permissions.');
                        }
                    });

                },
                onConnectionChange: (state) => {
                    if (attempt === generation.current && state === 'connected' && !receivedFrames.current) setStatus('Connected to Decart. Waiting for AI video; the camera preview is not the AI result.');
                    if (attempt === generation.current && (state === 'disconnected' || state === 'reconnecting'))
                    stop('Connection ended. Your camera is off. Start a new trial when ready.'); },
            });
            if (attempt !== generation.current) {
                result.disconnect();
                return;
            }
            session.current = result;
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
            setStatus('Applying the new garmentâ€¦');
            try {
                await current.set({ prompt, enhance: false, image: reference(next.image) });
                if (attempt !== generation.current)
                    return;
                setGarment(next);
                setStatus('Garment sent to Decart. The AI video may take a moment to update.');
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
            <div className="intro"><div><div className="eyebrow">POWERED BY DECART LUCY</div><h1>See it on you.</h1><p>A live fitting room, with room to experiment.</p></div><span className="demo-label">30-SECOND API TRIAL</span></div>
            <section className="live-layout">
                <div className="video-area">
                    <div className="output">
                        <video ref={remoteVideo} onPlaying={() => {
                            if (!active.current || !remoteVideo.current?.srcObject || !remoteVideo.current.videoWidth) return;
                            receivedFrames.current = true;
                            setPhase('live');
                            setStatus('Live AI preview. Change a garment below or stop at any time.');
                        }} autoPlay playsInline muted aria-label="AI try-on"/>
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
                    <button className="primary full" disabled={!configured || !consent || cooldown > 0 || phase !== 'idle'} onClick={start}>{phase === 'idle' ? (cooldown > 0 ? `Try again in ${cooldown}s` : 'Start 30-second try-on') : 'Session in progress'}</button>
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
