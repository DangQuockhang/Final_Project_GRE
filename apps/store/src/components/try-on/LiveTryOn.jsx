import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const reference = (image) => typeof image === 'string' ? new URL(image, location.origin).href : image;
export default function LiveTryOn({ token, initialGarment }) {
    const [configured, setConfigured] = useState(null);
    const [status, setStatus] = useState('Checking the AI connection…');
    const [phase, setPhase] = useState('idle');
    const [consent, setConsent] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const [remaining, setRemaining] = useState(30);
    const [garment, setGarment] = useState(initialGarment ? { ...initialGarment, preview: initialGarment.image } : { ...samples[0], preview: samples[0].image });
    const localVideo = useRef(null), remoteVideo = useRef(null);
    const session = useRef(null), camera = useRef(null);
    const generation = useRef(0), active = useRef(false), objectURL = useRef(null);
    const timer = useRef(null), connectionTimeout = useRef(null);
    const stop = useCallback((message = 'Session stopped. Your camera is off.') => {
        generation.current++;
        active.current = false;
        const old = session.current;
        session.current = null;
        old?.disconnect();
        camera.current?.getTracks().forEach(t => t.stop());
        camera.current = null;
        if (localVideo.current)
            localVideo.current.srcObject = null;
        if (remoteVideo.current)
            remoteVideo.current.srcObject = null;
        if (timer.current)
            clearInterval(timer.current);
        if (connectionTimeout.current)
            clearTimeout(connectionTimeout.current);
        setPhase('idle');
        setSwapping(false);
        setStatus(message);
    }, []);
    async function check() {
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
    }, [stop]);
    async function start() {
        if (active.current || !configured || !consent)
            return;
        const attempt = ++generation.current;
        active.current = true;
        setPhase('starting');
        setStatus('Requesting camera access…');
        setRemaining(30);
        try {
            const { createDecartClient, models } = await import('@decartai/sdk');
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
            connectionTimeout.current = setTimeout(() => stop('Connection timed out. Your camera is off. Please try again.'), 45000);
            const client = createDecartClient({ apiKeyProvider: async () => {
                    if (attempt !== generation.current)
                        throw Error('Session cancelled.');
                    const res = await fetch(API + '/try-on', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
                    const data = await res.json();
                    if (!res.ok)
                        throw Error(data.error || 'Could not authorize the AI session.');
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
                    if (attempt !== generation.current)
                        return;
                    if (remoteVideo.current)
                        remoteVideo.current.srcObject = output;
                    if (connectionTimeout.current)
                        clearTimeout(connectionTimeout.current);
                    setPhase('live');
                    setStatus('Live AI preview. Change a garment below or stop at any time.');
                    if (timer.current)
                        clearInterval(timer.current);
                    const end = Date.now() + 30000;
                    timer.current = setInterval(() => { const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setRemaining(left); if (!left)
                        stop('30-second trial complete. Your camera is off.'); }, 250);
                },
                onConnectionChange: (state) => { if (attempt === generation.current && (state === 'disconnected' || state === 'reconnecting'))
                    stop('Connection ended. Your camera is off. Start a new trial when ready.'); },
            });
            if (attempt !== generation.current) {
                result.disconnect();
                return;
            }
            session.current = result;
            result.on('error', () => { if (attempt === generation.current)
                stop('The AI session failed. Check your network, account credits and model access.'); });
            result.on('sessionEnded', () => { if (attempt === generation.current)
                stop('The provider ended this trial. Your camera is off.'); });
        }
        catch (e) {
            if (attempt !== generation.current)
                return;
            const message = e instanceof Error && e.name === 'NotAllowedError' ? 'Camera permission was declined. Allow it in your browser to try again.' : e instanceof Error ? e.message : 'Could not start the AI session.';
            stop(message);
        }
    }
    async function choose(next) {
        if (swapping || phase === 'starting')
            return;
        if (session.current) {
            const current = session.current, attempt = generation.current;
            setSwapping(true);
            setStatus('Applying the new garment…');
            try {
                await current.set({ prompt, image: reference(next.image) });
                if (attempt !== generation.current)
                    return;
                setGarment(next);
                setStatus('Garment updated. Live preview is continuing.');
            }
            catch {
                if (attempt === generation.current)
                    setStatus('Could not change the garment. Your previous selection is kept.');
            }
            finally {
                if (attempt === generation.current)
                    setSwapping(false);
            }
        }
        else
            setGarment(next);
    }
    function upload(file) {
        if (!file)
            return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setStatus('Choose a JPG, PNG or WebP garment photo smaller than 5 MB.');
            return;
        }
        if (objectURL.current)
            URL.revokeObjectURL(objectURL.current);
        objectURL.current = URL.createObjectURL(file);
        void choose({ name: 'Your garment', image: file, preview: objectURL.current });
    }
    return _jsxs("div", { className: "kd-live-demo", children: [_jsx("div", { className: "announcement", children: "Your garment. Your camera. A new perspective." }), _jsxs("header", { children: [_jsxs("a", { className: "brand", href: "/shop", children: ["KD", _jsx("span", { children: "DESIGN" })] }), _jsx("nav", { children: "LIVE FITTING ROOM" }), _jsx("a", { className: "back", href: "/shop", children: "\u2190 Back to styling" })] }), _jsxs("main", { children: [_jsxs("div", { className: "breadcrumb", children: ["KD Design ", _jsx("span", { children: "/" }), " Live try-on"] }), _jsxs("div", { className: "intro", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "POWERED BY DECART LUCY" }), _jsx("h1", { children: "See it on you." }), _jsx("p", { children: "A live fitting room, with a little room to experiment." })] }), _jsx("span", { className: "demo-label", children: "30-SECOND API TRIAL" })] }), _jsxs("section", { className: "live-layout", children: [_jsxs("div", { className: "video-area", children: [_jsxs("div", { className: "output", children: [_jsx("video", { ref: remoteVideo, autoPlay: true, playsInline: true, muted: true, "aria-label": "AI try-on result" }), _jsx("div", { className: "video-label", children: phase === 'live' ? `LIVE AI · ${remaining}s` : 'AI TRY-ON PREVIEW' }), phase !== 'live' && _jsxs("div", { className: "video-placeholder", children: [_jsx("span", { children: "\u2727" }), _jsx("h2", { children: phase === 'starting' ? 'Preparing your look…' : 'Your look comes to life here.' }), _jsx("p", { children: phase === 'starting' ? 'Waiting for the AI video stream.' : 'Choose a garment, then start your trial.' })] })] }), _jsxs("div", { className: "camera-preview", children: [_jsx("video", { ref: localVideo, autoPlay: true, playsInline: true, muted: true, "aria-label": "Original camera preview" }), _jsx("span", { children: "Original camera \u00B7 No AI" })] })] }), _jsxs("aside", { className: "session-panel", children: [_jsx("div", { className: "eyebrow", children: "YOUR SELECTED PIECE" }), _jsx("img", { className: "selected-garment", src: garment.preview, alt: garment.name }), _jsx("h2", { children: garment.name }), _jsx("p", { className: "live-status", role: "status", "aria-live": "polite", children: status }), configured === false && _jsxs("div", { className: "setup-note", children: [_jsx("strong", { children: "One-time setup" }), _jsx("p", { children: "Create an API key in Decart Platform, then save it as DECART_API_KEY in the server settings. Never paste it into this page." }), _jsx("a", { href: "https://platform.decart.ai", target: "_blank", rel: "noopener noreferrer", children: "Open Decart Platform \u2197" }), _jsx("button", { className: "outline full", onClick: check, children: "Check connection again" })] }), _jsxs("label", { className: "consent", children: [_jsx("input", { type: "checkbox", checked: consent, disabled: phase !== 'idle', onChange: e => setConsent(e.target.checked) }), _jsxs("span", { children: ["I agree to send my camera video and garment image to Decart for this trial. API credits may be used. ", _jsx("a", { href: "https://docs.platform.decart.ai/resources/privacy-policy", target: "_blank", rel: "noopener noreferrer", children: "Privacy information" })] })] }), _jsx("button", { className: "primary full", disabled: !configured || !consent || phase !== 'idle', onClick: start, children: phase === 'idle' ? 'Start 30-second try-on →' : 'Session in progress' }), _jsx("button", { className: "outline full stop", disabled: phase === 'idle', onClick: () => stop(), children: "Stop & turn camera off" }), _jsx("p", { className: "micro", children: "No microphone \u00B7 Stops when you leave this tab" })] })] }), _jsxs("section", { children: [_jsxs("div", { className: "sample-head", children: [_jsx("h2", { children: "Change your look." }), _jsx("p", { children: "Official Anywear samples \u00B7 Not KD Design products" })] }), _jsxs("div", { className: "live-samples", children: [samples.map(s => _jsxs("button", { disabled: phase === 'starting' || swapping, className: garment.image === s.image ? 'chosen' : '', "aria-pressed": garment.image === s.image, onClick: () => choose({ ...s, preview: s.image }), children: [_jsx("img", { src: s.image, alt: s.name }), _jsx("span", { children: s.name })] }, s.image)), _jsxs("label", { className: "upload-garment", children: [_jsx("span", { children: "\uFF0B" }), _jsx("strong", { children: "Try your own garment" }), _jsx("small", { children: "JPG, PNG or WebP \u00B7 Up to 5 MB" }), _jsx("input", { type: "file", accept: "image/jpeg,image/png,image/webp", disabled: phase === 'starting' || swapping, onChange: e => upload(e.target.files?.[0]) })] })] })] }), _jsxs("aside", { className: "help", children: [_jsx("p", { children: "Stand in even light and keep your upper body visible. This AI preview helps you explore appearance; it does not measure your size or guarantee physical fit." }), _jsxs("p", { children: ["Prefer the ready-made experience? ", _jsx("a", { href: "/try-on.html", children: "Open the Anywear widget trial \u2197" })] })] }), _jsxs("footer", { children: [_jsx("span", { children: "KD DESIGN" }), _jsx("p", { children: "Thoughtfully styled. Uniquely yours." })] })] })] });
}
