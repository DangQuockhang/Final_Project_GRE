import {pool} from './db.js';
import {inspectDatabase} from './databaseHealth.js';

// Never initialize, seed, migrate or switch databases from a diagnostic command.
let client;
try {
 const target = new URL(process.env.DATABASE_URL);
 console.log(JSON.stringify({databaseTarget:{host:target.hostname,port:target.port||'5432',database:target.pathname.slice(1)}}));
 client = await pool.connect();
 await client.query('BEGIN READ ONLY');
 await client.query("SET LOCAL statement_timeout = '5s'");
 const schema = await inspectDatabase((...args)=>client.query(...args));
 console.log(JSON.stringify(schema,null,2));
 if (!schema.ready) {
  console.log('STOP: confirm the intended Docker volume and make a backup before any migration. Do not seed or reset an existing store.');
  process.exitCode = 1;
 }
 // Counts only, never customer records. Only query tables that exist.
 for (const table of ['products','orders','users']) {
  if (!schema.missingTables.includes(table)) {
   const {rows} = await client.query(`SELECT count(*) AS total FROM public.${table}`);
   console.log(JSON.stringify({table,total:rows[0].total}));
  }
 }
} catch (error) {
 console.error(JSON.stringify({ok:false,code:error.code||'DATABASE_CHECK_FAILED'}));
 process.exitCode = 1;
} finally {
 if (client) {await client.query('ROLLBACK').catch(()=>{});client.release();}
 await pool.end();
}
