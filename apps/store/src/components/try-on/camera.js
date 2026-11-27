// Publish the original camera track. Mirror only the local preview with CSS;
// do not introduce a generated track between the camera and the SDK encoder.
export const CAMERA_PUBLISH_OPTIONS = { mirror: false, preferredVideoCodec: 'vp8' };

export function cameraSnapshot(stream) {
    const track = stream?.getVideoTracks()[0];
    return {
        cameraTrack: track?.readyState === 'live' ? 'Live' : 'Ended / unavailable',
        cameraMuted: track ? Boolean(track.muted) : null,
        cameraEnabled: track ? Boolean(track.enabled) : null,
    };
}

// Opening a device is not proof that it is producing frames. Check two frames
// before minting a paid session, and make Stop/hidden-tab cancellation immediate.
export function waitForCameraFrames(video, stream, signal, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const track = stream.getVideoTracks()[0];
        if (!track || track.readyState !== 'live' || !track.enabled) {
            reject(Error('The camera track is not active. Check your camera and try again.'));
            return;
        }
        let finished = false, callbackId, timer, polling, count = 0, lastTime = -1;
        const finish = error => {
            if (finished) return;
            finished = true;
            clearTimeout(timer); clearInterval(polling);
            if (callbackId !== undefined) video.cancelVideoFrameCallback?.(callbackId);
            signal.removeEventListener('abort', abort);
            track.removeEventListener('ended', ended);
            error ? reject(error) : resolve();
        };
        const abort = () => finish(new DOMException('Cancelled', 'AbortError'));
        const ended = () => finish(Error('The camera stopped before video was ready. No AI session was started.'));
        const inspect = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && !track.muted && track.enabled && track.readyState === 'live' && ++count >= 2) finish();
        };
        signal.addEventListener('abort', abort, { once: true });
        track.addEventListener('ended', ended, { once: true });
        if (signal.aborted) { abort(); return; }
        timer = setTimeout(() => finish(Error('The camera opened but did not produce playable frames within 8 seconds. Check camera permissions or close other camera apps. No AI session was started.')), timeoutMs);
        video.srcObject = stream;
        if (video.requestVideoFrameCallback) {
            const frame = () => { inspect(); if (!finished) callbackId = video.requestVideoFrameCallback(frame); };
            callbackId = video.requestVideoFrameCallback(frame);
        } else {
            polling = setInterval(() => { if (video.readyState >= 2 && video.currentTime !== lastTime) { lastTime = video.currentTime; inspect(); } }, 50);
        }
        try {
            Promise.resolve(video.play()).catch(() => finish(Error('The browser could not play the camera preview. No AI session was started.')));
        } catch { finish(Error('The browser could not play the camera preview. No AI session was started.')); }
    });
}
