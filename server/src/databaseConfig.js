import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

function invalid(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}
function integer(value, fallback, min, max, name) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw invalid(`INVALID_${name}`);
  return number;
}

// Parse fields explicitly: pg's connectionString can otherwise replace the SSL
// object when sslmode/sslrootcert appear in the URL, weakening verification.
export function databaseConfig(env = process.env, baseDir = process.cwd()) {
  let url;
  try {
    url = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw 0;
    for (const key of url.searchParams.keys()) {
      if (!['sslmode', 'sslrootcert', 'application_name', 'connect_timeout'].includes(key)) throw 0;
    }
  } catch { throw invalid('INVALID_DATABASE_URL'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  const mode = env.DB_SSL_MODE || url.searchParams.get('sslmode') || (local ? 'disable' : 'verify-full');
  if (!['disable', 'require', 'verify-full'].includes(mode)) throw invalid('INVALID_DB_SSL_MODE');
  if (mode === 'disable' && env.NODE_ENV === 'production') throw invalid('DATABASE_TLS_REQUIRED');
  if (mode !== 'disable' && env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw invalid('DATABASE_TLS_VERIFICATION_REQUIRED');
  let ssl = false;
  if (mode !== 'disable') {
    // "require" is deliberately stricter than libpq: always verify identity.
    ssl = {rejectUnauthorized: true};
    const caFile = env.DB_SSL_CA_FILE || url.searchParams.get('sslrootcert');
    if (caFile) {
      try { ssl.ca = readFileSync(resolve(baseDir, caFile), 'utf8'); }
      catch { throw invalid('DATABASE_CA_FILE_UNREADABLE'); }
    }
  }
  let user, password, database;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch { throw invalid('INVALID_DATABASE_URL'); }
  return {
    host, port: integer(url.port, 5432, 1, 65535, 'DATABASE_PORT'), user, password, database, ssl,
    max: integer(env.DB_POOL_MAX, 5, 1, 50, 'DB_POOL_MAX'),
    connectionTimeoutMillis: integer(env.DB_CONNECT_TIMEOUT_MS,
      integer(url.searchParams.get('connect_timeout') ?? undefined, 10, 1, 60, 'CONNECT_TIMEOUT') * 1000,
      1000, 60000, 'DB_CONNECT_TIMEOUT_MS'),
    idleTimeoutMillis: 30000,
    keepAlive: true,
    application_name: url.searchParams.get('application_name') || 'kd-design-api',
  };
}

export function observePoolErrors(pool, log = console.error) {
  // An idle connection may be reset by a pooler/restart. Handle the pool event
  // without terminating Node; pg removes the failed client. Never retry writes.
  pool.on('error', error => {
    const code = /^[A-Z0-9_]{2,64}$/.test(error.code || '') ? error.code : 'DATABASE_POOL_ERROR';
    log(JSON.stringify({event: 'database_pool_error', code}));
  });
  return pool;
}
