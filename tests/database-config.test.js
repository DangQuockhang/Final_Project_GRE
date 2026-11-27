import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import pg from 'pg';
import {databaseConfig, observePoolErrors} from '../server/src/databaseConfig.js';

const remote = 'postgresql://postgres.ref:p%40ss%3Aword@pool.example.test:5432/postgres';
test('local remains compatible; cloud validates TLS and decodes credentials', () => {
  const local = new pg.Client(databaseConfig({DATABASE_URL: 'postgres://kd:local@localhost:5433/kd_desgin'}));
  assert.equal(local.connectionParameters.ssl, false);
  assert.equal(local.connectionParameters.port, 5433);
  const cloud = new pg.Client(databaseConfig({DATABASE_URL: remote + '?sslmode=require'}));
  assert.equal(cloud.connectionParameters.password, 'p@ss:word');
  assert.equal(cloud.connectionParameters.ssl.rejectUnauthorized, true);
  assert.equal(databaseConfig({DATABASE_URL:remote + '?connect_timeout=20'}).connectionTimeoutMillis, 20000);
});
test('URL cannot override SSL policy or host; errors do not expose URL', () => {
  for (const suffix of ['?sslmode=no-verify', '?ssl=false', '?host=evil', '?uselibpqcompat=true', '?sslmode=prefer']) {
    assert.throws(() => databaseConfig({DATABASE_URL: remote + suffix}), error => !error.message.includes('p%40ss'));
  }
  assert.throws(() => databaseConfig({DATABASE_URL: remote, DB_SSL_MODE: 'disable', NODE_ENV: 'production'}), {code:'DATABASE_TLS_REQUIRED'});
  assert.throws(() => databaseConfig({DATABASE_URL: remote, NODE_TLS_REJECT_UNAUTHORIZED: '0'}), {code:'DATABASE_TLS_VERIFICATION_REQUIRED'});
  assert.throws(() => databaseConfig({DATABASE_URL: 'postgres://secret:password@['}), {message:'INVALID_DATABASE_URL'});
  assert.throws(() => databaseConfig({DATABASE_URL: remote, DB_POOL_MAX:'1000'}), {code:'INVALID_DB_POOL_MAX'});
});
test('CA survives pg parsing even when URL includes sslmode', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kd-cloud-config-'));
  try {
    writeFileSync(join(dir, 'root.crt'), 'test certificate');
    const c = new pg.Client(databaseConfig({DATABASE_URL: remote + '?sslmode=require', DB_SSL_CA_FILE:'root.crt'}, dir));
    assert.equal(c.connectionParameters.ssl.ca, 'test certificate');
    assert.equal(c.connectionParameters.ssl.rejectUnauthorized, true);
    assert.throws(() => databaseConfig({DATABASE_URL:remote, DB_SSL_CA_FILE:'missing.crt'}, dir), {code:'DATABASE_CA_FILE_UNREADABLE'});
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
test('idle pool reset is handled without logging connection details or retrying', () => {
  const pool = new EventEmitter(), logs = [];
  observePoolErrors(pool, line => logs.push(JSON.parse(line)));
  pool.emit('error', Object.assign(new Error(remote), {code:'ECONNRESET'}));
  pool.emit('error', Object.assign(new Error(remote), {code:remote}));
  assert.deepEqual(logs, [{event:'database_pool_error',code:'ECONNRESET'}, {event:'database_pool_error',code:'DATABASE_POOL_ERROR'}]);
});
