import { CAMERA_PUBLISH_OPTIONS, waitForCameraFrames } from '../apps/store/src/components/try-on/camera.js';

// Real browser WebRTC, with local peers only: no Decart API, STUN or TURN service.
export async function checkCameraLoopback(stream, assert) {
    const preview = document.createElement('video');
    preview.muted = true; preview.playsInline = true;
    preview.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px';
    const remote = preview.cloneNode(); remote.muted = true;
    document.body.append(preview, remote);
    const left = new RTCPeerConnection({ iceServers: [] });
    const right = new RTCPeerConnection({ iceServers: [] });
    right.ontrack = ({ streams }) => { remote.srcObject = streams[0]; remote.play().catch(() => {}); };
    const pendingLeft = [], pendingRight = [];
    let candidateError;
    left.onicecandidate = ({ candidate }) => { if (candidate) {
        if (right.remoteDescription) right.addIceCandidate(candidate).catch(e => candidateError = e);
        else pendingRight.push(candidate);
    } };
    right.onicecandidate = ({ candidate }) => { if (candidate) {
        if (left.remoteDescription) left.addIceCandidate(candidate).catch(e => candidateError = e);
        else pendingLeft.push(candidate);
    } };
    try {
        const aborted = new AbortController(); aborted.abort();
        let cancelled = false;
        try { await waitForCameraFrames(preview, stream, aborted.signal); } catch (error) { cancelled = error.name === 'AbortError'; }
        assert(cancelled, 'camera preflight obeys Stop cancellation');
        await waitForCameraFrames(preview, stream, new AbortController().signal);
        assert(preview.videoWidth > 0, 'camera preflight observes actual source frames');

        const sender = left.addTrack(stream.getVideoTracks()[0], stream);
        const transceiver = left.getTransceivers().find(item => item.sender === sender);
        const codecs = RTCRtpSender.getCapabilities('video').codecs.filter(codec => codec.mimeType.toLowerCase() === 'video/' + CAMERA_PUBLISH_OPTIONS.preferredVideoCodec);
        assert(codecs.length > 0, 'browser supports the selected publish codec');
        transceiver.setCodecPreferences(codecs);
        await left.setLocalDescription(await left.createOffer());
        await right.setRemoteDescription(left.localDescription);
        for (const candidate of pendingRight) await right.addIceCandidate(candidate);
        await right.setLocalDescription(await right.createAnswer());
        await left.setRemoteDescription(right.localDescription);
        for (const candidate of pendingLeft) await left.addIceCandidate(candidate);
        let sent = false, received = false;
        for (let attempt = 0; attempt < 150; attempt++) {
            const outgoing = await sender.getStats();
            outgoing.forEach(report => { if (report.type === 'outbound-rtp' && report.kind === 'video' && report.bytesSent > 0 && report.framesEncoded > 0) {
                const codec = outgoing.get(report.codecId);
                sent = codec?.mimeType?.toLowerCase() === 'video/vp8';
            } });
            const incoming = await right.getStats();
            incoming.forEach(report => { if (report.type === 'inbound-rtp' && report.kind === 'video' && report.framesDecoded > 0) received = true; });
            if (sent && received) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(!candidateError, 'local ICE exchange succeeded');
        assert(sent && received, `direct camera track: VP8 sent=${sent}, frames decoded=${received}, ICE=${left.iceConnectionState}/${right.iceConnectionState}, gathering=${left.iceGatheringState}/${right.iceGatheringState}`);
    } finally {
        left.close(); right.close(); preview.srcObject = null; preview.remove(); remote.srcObject = null; remote.remove();
        stream.getTracks().forEach(track => track.stop());
    }
}
