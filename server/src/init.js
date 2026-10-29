import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pool} from './db.js';
let client;
try{
 client=await pool.connect();await client.query('BEGIN');
 for(const file of ['001_schema.sql','002_customer_accounts.sql']){
  await client.query(readFileSync(fileURLToPath(new URL('../sql/'+file,import.meta.url)),'utf8'));
 }
 await client.query('COMMIT');console.log('Database schema initialized.');
}catch(error){if(client)await client.query('ROLLBACK');console.error(error.message);process.exitCode=1;}
finally{client?.release();await pool.end();}
