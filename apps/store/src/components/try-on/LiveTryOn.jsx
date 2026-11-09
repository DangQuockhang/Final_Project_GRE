import React from 'react';
import { apiBase } from '@kd/catalog';
import './live-try-on.css';
import { readTiming, createTrialClock } from './timing';
import { CAMERA_PUBLISH_OPTIONS, cameraSnapshot, waitForCameraFrames } from './camera';
import { emptyDiagnostics, safeStats, timeoutMessage, providerError, sessionEndMessage, prepareGarment } from './diagnostics';
const API = import.meta.env.VITE_API_URL || apiBase;
import { useCallback, useEffect, useRef, useState } from 'react';
const samples = [
    { name: 'Charcoal outerwear', image: '/garments/sample-2.png' },
    { name: 'Statement knitwear', image: '/garments/sample-3.png' },
    { name: 'The light layer', image: '/garments/sample-4.png' },
];
const prompt = 'Dress the person in the garment from the reference image. Preserve the person and background.';
const loadDecart = () => import('@decartai/sdk');
export default function LiveTryOn({ token, initialGarment, loadSdk = loadDecart }) {
    const diagnostics = useRef(emptyDiagnostics());
    const [details, setDetails] = useState(emptyDiagnostics);
    const imageRequest = useRef(null), disconnectTimer = useRef(null), cameraCheck = useRef(null);
    function record(values) { diagnostics.current = { ...diagnostics.current, ...values }; setDetails(diagnostics.current); }
    async function loadGarment(image) {
        const controller = new AbortController();
        imageRequest.current = controller;
        const timeout = setTimeout(() => controller.abort(), 10000);
        try { return await prepareGarment(image, controller.signal); }
        catch (error) { if (error?.name === 'AbortError') throw Error('Garment loading was cancelled or exceeded 10 seconds.'); throw error; }
        finally { clearTimeout(timeout); if (imageRequest.current === controller) imageRequest.current = null; }
    }
    const receivedFrames = useRef(false), garmentApplied = useRef(false);
    const [cooldown, setCooldown] = useState(0);
    const cooldownUntil = useRef(0);
    const [hasError, setHasError] = useState(false);
    const pendingConnect = useRef(false), tokenRequest = useRef(null);
    const [configured, setConfigured] = useState(null);
    const [status, setStatus] = useState('Checking the AI connection.');
    const [phase, setPhase] = useState('idle');
    const [consent, setConsent] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const [remaining, setRemaining] = useState(60);
    const [timing, setTiming] = useState(null);
    const trialClock = useRef(null), attemptTiming = useRef(null);
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
        trialClock.current = null;
        clearTimeout(disconnectTimer.current);
        imageRequest.current?.abort();
        cameraCheck.current?.abort();
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
    function finishTimedTrial(snapshot) {
        const limits = attemptTiming.current;
        setHasError(snapshot.stage !== 'live');
        stop(snapshot.stage === 'live'
            ? `${limits.liveSeconds}-second preview complete. Your camera is off.`
            : timeoutMessage({ ...diagnostics.current, playing: false }, limits.setupSeconds, limits.liveSeconds));
    }
    function activateLive() {
        if (!active.current || !receivedFrames.current || !garmentApplied.current || !trialClock.current) return;
        if (!trialClock.current.startLive()) { finishTimedTrial(trialClock.current.snapshot()); return; }
        setRemaining(trialClock.current.snapshot().remaining);
        setPhase('live');
        setStatus('Live AI preview. Change a garment below or stop at any time.');
    }
    async function check() {
        setHasError(false);
        try {
            const response = await fetch(API + '/try-on', { cache: 'no-store', headers: { Authorization: 'Bearer ' + token } });
            const body = await response.json();
            if (!response.ok)
                throw Error(body.error || 'Connection check failed.');
            const limits = body.configured ? readTiming(body) : null;
            setTiming(limits);
            setConfigured(body.configured === true);
            setStatus(body.configured ? `Ready: up to ${limits.setupSeconds}s to prepare, then ${limits.liveSeconds}s of live preview. Keep this tab visible.` : 'Setup needed: enable try-on and add the Decart API key on the server.');
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
            stop('Session stopped because this tab was hidden. Keep the fitting-room tab visible while preparing and trying on. Camera is off; no automatic restart.'); };
        document.addEventListener('visibilitychange', hide);
        const leave = () => stop();
        window.addEventListener('pagehide', leave);
        return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); stop(); if (objectURL.current)
            URL.revokeObjectURL(objectURL.current); };
    }, [stop, token]);
    async function start() {
        if (pendingConnect.current) { setHasError(true); setStatus('The previous connection is closing. Please wait before starting again.'); return; }
        if (Date.now() < cooldownUntil.current || active.current || !configured || !timing || !consent || document.hidden)
            return;
        const attempt = ++generation.current;
        active.current = true;
        diagnostics.current = emptyDiagnostics();
        setDetails(diagnostics.current);
        receivedFrames.current = false;
        garmentApplied.current = false;
        setHasError(false);
        setPhase('starting');
        setStatus('Checking the garment photo before starting a paid session.');
        setRemaining(timing.setupSeconds);
        attemptTiming.current = timing;
        try {
            const { createDecartClient, models, noopLogger } = await loadSdk();
            if (attempt !== generation.current)
                return;
            const model = models.realtime('lucy-vton-3.6');
            const garmentBlob = await loadGarment(garment.image);
            if (attempt !== generation.current) return;
            record({ imageReady: true });
            setStatus('Requesting camera access.');
            if (!navigator.mediaDevices?.getUserMedia)
                throw Error('Camera access requires HTTPS or localhost in a supported browser.');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: model.width }, height: { ideal: model.height }, frameRate: model.fps } });
            if (attempt !== generation.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            camera.current = stream;
            record({ cameraReady: true, ...cameraSnapshot(stream) });
            setStatus('Checking that your camera is producing video.');
            const controller = new AbortController();
            cameraCheck.current = controller;
            await waitForCameraFrames(localVideo.current, stream, controller.signal);
            if (attempt !== generation.current) return;
            cameraCheck.current = null;
            record({ cameraFrames: true, ...cameraSnapshot(stream) });
            setStatus('Connecting to Lucy. Your camera preview is shown separately.');
            // Preparation has its own deadline; the live allowance starts only after
            // garment ACK and playable remote video. The hard cap never moves.
            trialClock.current = createTrialClock(timing);
            timer.current = setInterval(() => {
                if (attempt !== generation.current || !trialClock.current) return;
                const snapshot = trialClock.current.snapshot();
                setRemaining(snapshot.remaining);
                if (snapshot.expired) finishTimedTrial(snapshot);
            }, 250);
            tokenRequest.current = new AbortController();
            const signal = tokenRequest.current.signal;
            let credentialPromise;
            pendingConnect.current = attempt;
            const client = createDecartClient({ telemetry: false, logger: noopLogger, apiKeyProvider: async () => {
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    // Reuse one short-lived credential for image uploads, never mint automatically again.
                    credentialPromise ??= fetch(API + '/try-on', { method: 'POST', signal, headers: { Authorization: 'Bearer ' + token } }).then(async res => {
                        const data = await res.json();
                        if (res.status === 429 || res.ok) {
                            const seconds = res.ok ? timing.cooldownSeconds : Math.min(300, Math.max(1, Number(data.retryAfterSeconds) || timing.cooldownSeconds));
                            cooldownUntil.current = Date.now() + seconds * 1000;
                            setCooldown(seconds);
                        }
                        if (!res.ok) throw Error(data.error || 'Could not authorize the AI session.');
                        const issuedTiming = readTiming(data);
                        if (Object.keys(timing).some(key => issuedTiming[key] !== timing[key]))
                            throw Error('Trial limits changed. Refresh the page before starting again.');
                        return data;
                    });
                    const data = await credentialPromise;
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    if (typeof data.apiKey !== 'string' || !data.apiKey)
                        throw Error('The server returned an invalid session token.');
                    record({ tokenReady: true });
                    return data.apiKey;
                } });
            const result = await client.realtime.connect(stream, {
                model, ...CAMERA_PUBLISH_OPTIONS, retries: 0, capacityRetryBudgetMs: 0,
                onQueuePosition: ({ position }) => {
                    if (attempt !== generation.current || !Number.isFinite(position) || position < 0) return;
                    record({ queuePosition: Math.floor(position) });
                    setStatus('Decart queue position: ' + Math.floor(position) + `. Waiting within the ${timing.setupSeconds}-second preparation limit; no automatic retry.`);
                },
                onRemoteStream: (output) => {
                    if (attempt !== generation.current) { output.getTracks().forEach(t => t.stop()); return; }
                    const video = remoteVideo.current;
                    if (!video) return;
                    video.srcObject = output;
                    record({ streamReceived: true });
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
                    if (attempt !== generation.current) return;
                    if (state === 'reconnecting') { setHasError(true); stop('Connection interrupted. Automatic reconnect was stopped. Camera is off.'); }
                    // While connect is pending, let its rejection reach catch without invalidating it.
                    // Once connected, let a same-turn error/sessionEnded explain a close first.
                    if (state === 'disconnected' && session.current) {
                        clearTimeout(disconnectTimer.current);
                        disconnectTimer.current = setTimeout(() => { if (attempt === generation.current) { setHasError(true); stop('Decart disconnected before the trial finished. Camera is off. No automatic retry.'); } }, 0);
                    }
                },
            });
            if (attempt !== generation.current) {
                result.disconnect();
                return;
            }
            session.current = result;
            record({ connected: true });
            result.on('stats', stats => { if (attempt === generation.current) record({ ...safeStats(stats), ...cameraSnapshot(camera.current) }); });
            result.on('error', (error) => { if (attempt === generation.current)
                { setHasError(true); stop(providerError(error)); } });
            result.on('sessionEnded', event => { if (attempt === generation.current) {
                setHasError(true); stop(sessionEndMessage(event?.reason)); } });
            // Apply the garment after the transport is ready and await the provider's ACK.
            // Until this resolves, an incoming stream may still show the unedited input.
            setStatus('Connected. Sending your selected garment to Decart.');
            await result.set({ prompt, enhance: false, image: garmentBlob });
            if (attempt !== generation.current) return;
            garmentApplied.current = true;
            record({ garmentAccepted: true });
            if (receivedFrames.current) activateLive();
            else setStatus('Garment accepted by Decart. Waiting for AI video.');
        }
        catch (e) {
            if (attempt !== generation.current)
                return;
            setHasError(true);
            const message = e?.name === 'NotAllowedError' ? 'Camera permission was declined. Allow it in your browser to try again.' : providerError(e);
            stop(message);
        } finally { if (pendingConnect.current === attempt) pendingConnect.current = false; }
    }
    async function choose(next) {
        if (swapping || phase === 'starting')
            return;
        if (session.current) {
            const current = session.current, attempt = generation.current;
            setHasError(false);
            setSwapping(true);
            setStatus('Applying the new garment.');
            try {
                const image = await loadGarment(next.image);
                if (attempt !== generation.current) return;
                await current.set({ prompt, enhance: false, image });
                if (attempt !== generation.current)
                    return;
                setGarment(next);
                setStatus('Garment sent to Decart. The AI video may take a moment to update.');
                return true;
            }
            catch (error) {
                if (attempt === generation.current)
                    { setHasError(true); setStatus('Could not change the garment. ' + providerError(error)); }
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
            <div className="intro"><div><div className="eyebrow">POWERED BY DECART LUCY</div><h1>See it on you.</h1><p>A live fitting room, with room to experiment.</p></div><span className="demo-label">{timing?.liveSeconds ?? 30}-SECOND LIVE PREVIEW</span></div>
            <section className="live-layout">
                <div className="video-area">
                    <div className="output">
                        <video ref={remoteVideo} onPlaying={() => {
                            if (!active.current || !remoteVideo.current?.srcObject || !remoteVideo.current.videoWidth) return;
                            receivedFrames.current = true;
                            record({ playing: true });
                            activateLive();
                        }} autoPlay playsInline muted aria-label="AI try-on"/>
                        <div className="video-label">{phase === 'starting' ? 'Preparing AI' : 'AI try-on'} {phase !== 'idle' && `/ ${remaining}s left`}</div>
                        {phase !== 'live' && <div className="video-placeholder"><h2>{phase === 'starting' ? 'Preparing your look.' : 'Your look comes to life here.'}</h2><p>{phase === 'starting' ? 'Connecting to the AI video stream.' : 'Choose a garment, then start your trial.'}</p></div>}
                    </div>
                    <div className="camera-preview"><video ref={localVideo} autoPlay playsInline muted aria-label="Original camera"/><span>Original camera / No AI</span></div>
                </div>
                <aside className="session-panel">
                    <div className="eyebrow">YOUR SELECTED PIECE</div><img className="selected-garment" src={garment.preview} alt={garment.name}/><h2>{garment.name}</h2>
                    <p className={'live-status'+(hasError?' is-error':'')} role={hasError?'alert':'status'} aria-live="polite">{status}</p>
                    <details className="connection-details" open={hasError || undefined}>
                        <summary>Connection details</summary>
                        <dl>{[
                            ['Garment photo checked', details.imageReady], ['Camera opened', details.cameraReady],
                            ['Camera frames verified', details.cameraFrames], ['Session token received', details.tokenReady], ['Connection and publishing ready', details.connected],
                            ['Garment acknowledged', details.garmentAccepted], ['AI stream received', details.streamReceived],
                            ['Video playback started', details.playing],
                        ].map(([label, done]) => <div key={label}><dt>{label}</dt><dd>{done ? 'Yes' : 'Not confirmed'}</dd></div>)}
                        <div><dt>Queue position reported</dt><dd>{details.queuePosition ?? 'None reported'}</dd></div>
                        <div><dt>Camera track (last sample)</dt><dd>{details.cameraTrack ?? 'Not checked'}</dd></div>
                        <div><dt>Camera muted / enabled</dt><dd>{details.cameraMuted === null ? '?' : String(details.cameraMuted)} / {details.cameraEnabled === null ? '?' : String(details.cameraEnabled)}</dd></div>
                        <div><dt>Camera publish mode</dt><dd>Direct / VP8</dd></div>
                        <div><dt>Camera video bytes sent</dt><dd>{details.bytesSent ?? 'Not reported'}</dd></div>
                        <div><dt>AI frames received / decoded</dt><dd>{details.framesReceived ?? '?'} / {details.framesDecoded ?? '?'}</dd></div></dl>
                        <p>Last attempt only. Missing counters do not prove a network failure. These details contain no tokens or camera images.</p>
                    </details>
                    {configured === false && <div className="setup-note"><strong>Setup or account access needed</strong><p>Sign in and ask the shop administrator to enable this demo. The API key belongs in server settings only.</p><a href="https://platform.decart.ai" target="_blank" rel="noopener noreferrer">Decart Platform</a><button className="outline full" onClick={check}>Check connection again</button></div>}
                    <label className="consent"><input type="checkbox" checked={consent} disabled={phase !== 'idle'} onChange={e=>setConsent(e.target.checked)}/><span>I agree to send my camera video and garment image to Decart for this trial. Up to {timing?.sessionSeconds ?? 90}s including preparation; API credits may be used while waiting. <a href="https://docs.platform.decart.ai/resources/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy information</a></span></label>
                    <button className="primary full" disabled={!configured || !consent || cooldown > 0 || phase !== 'idle'} onClick={start}>{phase === 'idle' ? (cooldown > 0 ? `Try again in ${cooldown}s` : 'Start live try-on') : 'Session in progress'}</button>
                    <button className="outline full stop" disabled={phase === 'idle'} onClick={()=>{setHasError(false);stop();}}>Stop &amp; turn camera off</button><p className="micro">Up to {timing?.setupSeconds ?? 60}s preparation, then {timing?.liveSeconds ?? 30}s preview. Keep this tab visible; switching tabs or minimizing stops the trial. No microphone.</p>
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
