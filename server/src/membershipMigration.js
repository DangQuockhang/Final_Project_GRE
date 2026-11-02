import {readFileSync} from 'node:fs';
const VERSION='004_membership_orders';
export async function migrateMembership(client,{rollback=false}={}){
 await client.query('SELECT pg_advisory_xact_lock(730031)');
 const applied=(await client.query('SELECT 1 FROM schema_migrations WHERE version=$1',[VERSION])).rowCount>0;
 if(applied===!rollback)return false;
 await client.query(readFileSync(new URL('../sql/'+VERSION+(rollback?'.down':'')+'.sql',import.meta.url),'utf8'));
 if(rollback)await client.query('DELETE FROM schema_migrations WHERE version=$1',[VERSION]);
 else await client.query('INSERT INTO schema_migrations(version) VALUES($1)',[VERSION]);
 return true;
}
