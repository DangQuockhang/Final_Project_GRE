import {pool} from './db.js';
import {migrateMembership} from './membershipMigration.js';
let client;
try{
 client=await pool.connect();await client.query('BEGIN');
 const changed=await migrateMembership(client,{rollback:true});
 await client.query('COMMIT');console.log(changed?'Migration 004 archived; data preserved.':'Migration 004 is not applied.');
}catch(error){if(client)await client.query('ROLLBACK');console.error(error.message);process.exitCode=1;}
finally{client?.release();await pool.end();}
