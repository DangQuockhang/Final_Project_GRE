export const emptyDiagnostics = () => ({
    imageReady: false, cameraReady: false, cameraFrames: false, tokenReady: false, connected: false,
    cameraTrack: null, cameraMuted: null, cameraEnabled: null,
    garmentAccepted: false, streamReceived: false, playing: false,
    queuePosition: null, bytesSent: null, framesReceived: null, framesDecoded: null,
});

const counter = value => Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

// Only copy numeric counters: SDK stats can also contain IP addresses and identifiers.
export function safeStats(stats) {
    return {
        bytesSent: counter(stats?.outboundVideo?.bytesSent),
        framesReceived: counter(stats?.video?.framesReceived),
        framesDecoded: counter(stats?.video?.framesDecoded),
    };
}

export function waitingMessage(info) {
    const suffix = ' The session is still open with no app time limit. Credits may be used while waiting. Use Stop to end it.';
    if (!info.tokenReady) return 'Still waiting for session authorization.' + suffix;
    if (!info.connected && info.queuePosition !== null) return 'Decart reported a queue. Still waiting for your connection.' + suffix;
    if (!info.connected) return 'Still waiting for Decart connection or camera publishing.' + suffix;
    if (!info.garmentAccepted) return 'Still waiting for Decart to acknowledge the garment.' + suffix;
    if (info.bytesSent === 0) return 'The SDK reports zero outgoing video bytes. Check the SDK worker and your connection.' + suffix;
    return 'Decart has not returned playable AI video yet.' + suffix;
}

export function providerError(error) {
    const raw = typeof error?.message === 'string' ? error.message : '';
    if (/insufficient.?credits/i.test(raw)) return 'Decart reports insufficient credits. Check the API account balance.';
    if (/session.?limit|concurrent session/i.test(raw)) return 'Decart reports that the concurrent session limit was reached. No automatic retry.';
    if (/capacity|try again later|server busy/i.test(raw)) return 'Decart reports that no processing slot is available. No automatic retry; try later.';
    // Never render URLs or credentials from provider exceptions.
    const message = raw.replace(/(?:https?|wss?):\/\/\S+/gi, '[URL removed]')
        .replace(/(?:dct_|ek_)[A-Za-z0-9._-]+/g, '[redacted]')
        .replace(/(?:Bearer\s+\S+|(?:access_token|api_key|apiKey|token)\s*[=:]\s*[^\s,;]+)/gi, '[credential removed]')
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
        .slice(0, 300);
    return message || 'Could not start the AI session.';
}

export function sessionEndMessage(reason) {
    const messages = {
        insufficient_credits: 'Decart ended this trial because credits are insufficient.',
        session_limit: 'Decart ended this trial because the concurrent session limit was reached.',
        moderation_violation: 'Decart declined this trial under its content policy.',
        policy_violation: 'Decart ended this trial under its access policy.',
    };
    return (messages[reason] || 'Decart ended this trial.') + ' Camera is off. No automatic retry.';
}

export async function prepareGarment(image, signal) {
    let blob = image;
    if (typeof image === 'string') {
        let response;
        try { response = await fetch(new URL(image, location.origin), { signal, credentials: 'omit' }); }
        catch (error) {
            if (signal.aborted) throw error;
            throw Error('The garment photo could not be loaded. Check the image URL or CORS, or upload the photo instead.');
        }
        if (!response.ok) throw Error('The garment photo is unavailable. Choose another photo or upload one.');
        if (Number(response.headers.get('content-length')) > 5 * 1024 * 1024) throw Error('Choose a garment photo up to 5 MB.');
        blob = await response.blob();
    }
    if (!(blob instanceof Blob) || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 5 * 1024 * 1024)
        throw Error('Choose a JPG, PNG or WebP garment photo up to 5 MB.');
    const url = URL.createObjectURL(blob);
    try {
        await new Promise((resolve, reject) => {
            const photo = new Image();
            const finish = error => { signal.removeEventListener('abort', abort); photo.onload = photo.onerror = null; photo.src = ''; error ? reject(error) : resolve(); };
            const abort = () => finish(new DOMException('Cancelled', 'AbortError'));
            photo.onload = () => finish(photo.naturalWidth && photo.naturalHeight ? null : Error('The garment photo is empty.'));
            photo.onerror = () => finish(Error('The garment photo cannot be decoded. Choose another JPG, PNG or WebP.'));
            signal.addEventListener('abort', abort, { once: true });
            if (signal.aborted) abort(); else photo.src = url;
        });
    } finally { URL.revokeObjectURL(url); }
    return blob;
}

