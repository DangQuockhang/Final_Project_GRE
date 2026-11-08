import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDiagnostics, safeStats, timeoutMessage, providerError, sessionEndMessage } from '../apps/store/src/components/try-on/diagnostics.js';

test('timeout identifies the incomplete stage without assuming provider overload', () => {
    const info = emptyDiagnostics();
    assert.match(timeoutMessage(info), /authorization/);
    info.tokenReady = true;
    assert.match(timeoutMessage(info), /connection or camera publishing/);
    info.queuePosition = 3;
    assert.match(timeoutMessage(info), /reported a queue/);
    info.connected = true;
    assert.match(timeoutMessage(info), /acknowledge/);
    info.garmentAccepted = true;
    assert.match(timeoutMessage(info), /No playable AI video/);
    info.bytesSent = 0;
    assert.match(timeoutMessage(info), /No outgoing/);
    info.framesDecoded = 8;
    assert.match(timeoutMessage(info), /playback did not start/);
    info.playing = true;
    assert.match(timeoutMessage(info), /trial complete/);
});

test('diagnostic snapshot omits addresses, tokens and arbitrary SDK fields', () => {
    assert.deepEqual(safeStats({ outboundVideo: { bytesSent: 1234 }, video: { framesReceived: 5, framesDecoded: 4 }, connection: { address: 'private-address' }, token: 'private-value' }), { bytesSent: 1234, framesReceived: 5, framesDecoded: 4 });
    assert.deepEqual(safeStats({ outboundVideo: { bytesSent: NaN }, video: { framesReceived: -1 } }), { bytesSent: null, framesReceived: null, framesDecoded: null });
});

test('provider exceptions redact credentials before display', () => {
    const message = providerError({ message: 'Failed wss://provider.example/?access_token=private token=secret apiKey=hidden Bearer password ek_sensitive dct_sensitive eyJabc.abc.xyz' });
    for (const secret of ['provider.example', 'secret', 'hidden', 'password', 'ek_sensitive', 'dct_sensitive', 'eyJabc']) assert.ok(!message.includes(secret));
    assert.match(providerError({message: 'Try Again Later: capacity'}), /processing slot/);
    assert.match(providerError({message: 'Concurrent session limit reached.'}), /session limit/);
    assert.match(sessionEndMessage('insufficient_credits'), /credits are insufficient/);
    assert.ok(!sessionEndMessage('secret-value').includes('secret-value'));
});
