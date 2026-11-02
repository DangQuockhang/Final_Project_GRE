import {pool} from './db.js';
import {migrateAccountFoundation} from './accountMigration.js';
let client;
try{
 client=await pool.connect();await client.query('BEGIN');
 const changed=await migrateAccountFoundation(client,{rollback:true});
 await client.query('COMMIT');
 console.log(changed?'Account foundation rolled back. Addresses preserved; all sessions revoked. Run the previous API revision.':'Account foundation is not applied; nothing changed.');
}catch(error){if(client)await client.query('ROLLBACK');console.error(error.message);process.exitCode=1;}
finally{client?.release();await pool.end();}
