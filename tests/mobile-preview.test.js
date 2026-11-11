import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import config from '../apps/store/vite.config.js';
import { productImageUrl } from '../packages/catalog/media.js';

test('LAN preview proxies API and media without rewriting the browser origin', async () => {
    const lan = config({ mode: 'lan' }), normal = config({ mode: 'development' });
    assert.equal(lan.define['import.meta.env.VITE_API_URL'], '"/api"');
    assert.equal(lan.server.proxy['/api'].target, 'http://127.0.0.1:4000');
    assert.equal(normal.define, undefined, 'normal development keeps existing API settings');
    assert(lan.optimizeDeps.exclude.includes('@decartai/sdk'));
    let received;
    const api = createHttpServer((req, res) => {
        received = { path: req.url, origin: req.headers.origin, auth: req.headers.authorization };
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true }));
    });
    await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
    const target = 'http://127.0.0.1:' + api.address().port;
    const reservation = createHttpServer();
    await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const vitePort = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    let vite;
    try {
        vite = await createViteServer({ ...lan, configFile: false, root: 'apps/store', logLevel: 'silent',
            optimizeDeps: { ...lan.optimizeDeps, noDiscovery: true, include: [] },
            server: { ...lan.server, host: '127.0.0.1', port: vitePort, proxy: {
                '/api': { ...lan.server.proxy['/api'], target }, '/media': { ...lan.server.proxy['/media'], target },
            } },
        });
        await vite.listen();
        const base = 'http://127.0.0.1:' + vite.httpServer.address().port;
        for (const path of ['/api/mobile-check', '/media/products/test.png']) {
            const res = await fetch(base + path, { headers: { Origin: 'http://192.168.1.10:5173', Authorization: 'Bearer test-only' } });
            assert.equal(res.status, 200); assert.deepEqual(await res.json(), { ok: true });
            assert.deepEqual(received, { path, origin: 'http://192.168.1.10:5173', auth: 'Bearer test-only' });
        }
    } finally { await vite?.close(); await new Promise(resolve => api.close(resolve)); }
});

test('LAN product photos stay on the phone-visible origin', () => {
    const photo = '/media/products/12345678-1234-1234-1234-123456789abc.webp';
    assert.equal(productImageUrl(photo, '/api'), photo);
    assert.equal(productImageUrl(photo, 'http://localhost:4000/api'), 'http://localhost:4000' + photo);
    assert.equal(productImageUrl('/media/products/../../secret', '/api'), null);
});
