// Exercise the real SDK's worker packaging without a credential or provider call.
export async function checkSdkWorker(stream, assert) {
    const sdk = await import('@decartai/sdk');
    const NativeWorker = window.Worker, NativeSocket = window.WebSocket;
    const workers = [], checks = [];
    window.Worker = class extends NativeWorker {
        constructor(url, options) {
            super(url, options); workers.push(this);
            checks.push(new Promise(resolve => {
                const timeout = setTimeout(() => resolve(false), 5000);
                this.addEventListener('message', event => {
                    if (event.data?.kind === 'initAck') { clearTimeout(timeout); resolve(true); }
                });
                this.addEventListener('error', event => { event.preventDefault(); clearTimeout(timeout); resolve(false); });
                this.postMessage({ kind: 'init' });
            }));
        }
        terminate() {} // SDK cleanup must not interrupt our worker asset probe.
    };
    window.WebSocket = class { constructor() { throw Error('Provider connection blocked by test'); } };
    try {
        const client = sdk.createDecartClient({ apiKey: 'local-worker-test-only', telemetry: false, logger: sdk.noopLogger });
        await client.realtime.connect(stream, { model: sdk.models.realtime('lucy-vton-3.6'), mirror: false, retries: 0, capacityRetryBudgetMs: 0, onRemoteStream() {} }).catch(() => {});
        assert(workers.length > 0, 'real SDK attempted frame metadata worker');
        assert((await Promise.all(checks)).every(Boolean), 'real SDK worker loads and acknowledges init (no missing optimized-dependency asset)');
    } finally {
        window.Worker = NativeWorker; window.WebSocket = NativeSocket;
        workers.forEach(worker => NativeWorker.prototype.terminate.call(worker));
        stream.getTracks().forEach(track => track.stop());
    }
}
