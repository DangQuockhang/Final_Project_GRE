import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pool} from './db.js';
try {
  const path = fileURLToPath(new URL('../sql/001_schema.sql',import.meta.url));
  await pool.query(readFileSync(path,'utf8'));
  console.log('Database schema initialized.');
} catch (error) {console.error(error); process.exitCode=1;}
finally {await pool.end();}
