import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForCameraFrames, cameraSnapshot } from '../apps/store/src/components/try-on/camera.js';

function fixture() {
    const track = Object.assign(new EventTarget(), { readyState: 'live', enabled: true, muted: false });
    const stream = { getVideoTracks: () => [track] };
    let frame, cancelled = false;
    const video = {
        videoWidth: 640, videoHeight: 480, play: async () => {},
        requestVideoFrameCallback(callback) { frame = callback; return 1; },
        cancelVideoFrameCallback() { cancelled = true; },
    };
    return { track, stream, video, frame: () => frame(), cancelled: () => cancelled };
}

test('camera preflight requires two unmuted frames and cleans its callback', async () => {
    const f = fixture(); let done = false;
    const result = waitForCameraFrames(f.video, f.stream, new AbortController().signal).then(() => done = true);
    f.track.muted = true; f.frame(); f.frame(); await Promise.resolve(); assert.equal(done, false);
    f.track.muted = false; f.frame(); await Promise.resolve(); assert.equal(done, false);
    f.frame(); await result; assert.equal(f.cancelled(), true);
    assert.deepEqual(cameraSnapshot(f.stream), { cameraTrack: 'Live', cameraMuted: false, cameraEnabled: true });
});

test('Stop cancels a pending camera check without waiting for frames', async () => {
    const f = fixture(), controller = new AbortController();
    const result = waitForCameraFrames(f.video, f.stream, controller.signal);
    controller.abort();
    await assert.rejects(result, { name: 'AbortError' });
    assert.equal(f.cancelled(), true);
});

test('camera opened without frames times out before a paid session', async () => {
    const f = fixture();
    await assert.rejects(waitForCameraFrames(f.video, f.stream, new AbortController().signal, 20), /No AI session was started/);
    assert.equal(f.cancelled(), true);
});

test('ended and disabled camera tracks are rejected', async () => {
    const f = fixture();
    f.track.enabled = false;
    await assert.rejects(waitForCameraFrames(f.video, f.stream, new AbortController().signal), /not active/);
    f.track.enabled = true;
    const result = waitForCameraFrames(f.video, f.stream, new AbortController().signal);
    f.track.dispatchEvent(new Event('ended'));
    await assert.rejects(result, /camera stopped/);
});
