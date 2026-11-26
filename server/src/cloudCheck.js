import pg from 'pg';
import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {databaseConfig, observePoolErrors} from './databaseConfig.js';
import {inspectDatabase, requiredSchema} from './databaseHealth.js';

// Explicit isolated file; never fall back to the running API's local database.
const serverDir = fileURLToPath(new URL('../', import.meta.url));
let pool, client;
try {
  const env = dotenv.parse(readFileSync(new URL('../.env.cloud', import.meta.url)));
  const config = databaseConfig({...env, NODE_ENV: 'production',
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED}, serverDir);
  if (['localhost', '127.0.0.1', '::1'].includes(config.host)) throw Object.assign(new Error(), {code: 'CLOUD_TARGET_IS_LOCAL'});
  if (config.host.endsWith('.pooler.supabase.com') && config.port !== 5432) throw Object.assign(new Error(), {code: 'USE_SESSION_POOLER_PORT_5432'});
  console.log(JSON.stringify({target: {host: config.host, port: config.port, database: config.database}}));
  pool = observePoolErrors(new pg.Pool({...config, max: 1}));
  client = await pool.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout = '10s'");
  const schema = await inspectDatabase((...args) => client.query(...args));
  const counts = {};
  for (const table of Object.keys(requiredSchema)) {
    if (!schema.missingTables.includes(table)) counts[table] = (await client.query(`SELECT count(*) AS total FROM public.${table}`)).rows[0].total;
  }
  const tls = client.connection.stream.encrypted === true;
  console.log(JSON.stringify({connected: true, tls, ...schema, counts}, null, 2));
  if (!tls) process.exitCode = 1;
  else if (!schema.ready && !process.argv.includes('--connect-only')) process.exitCode = 2;
  if (!schema.ready) console.log('Cloud connection checked; application schema is not ready. Restore a verified backup before switching the API.');
} catch (error) {
  const code = /^[A-Z0-9_]{2,64}$/.test(error.code || '') ? error.code : 'CLOUD_CHECK_FAILED';
  console.error(JSON.stringify({ok: false, code,
    hint: code === 'ENOENT' ? 'Create server/.env.cloud from the cloud example first.' : 'Check cloud host, database password, Session pooler port and CA certificate. No database was changed.'}));
  process.exitCode = 1;
} finally {
  if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); }
  if (pool) await pool.end();
}
