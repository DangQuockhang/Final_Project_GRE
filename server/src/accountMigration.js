import {readFileSync} from 'node:fs';
const VERSION='003_account_foundation';
const sql=name=>readFileSync(new URL('../sql/'+name,import.meta.url),'utf8');
// Caller owns BEGIN/COMMIT. The shared lock also serializes apply and rollback.
export async function migrateAccountFoundation(client,{rollback=false}={}){
 await client.query('SELECT pg_advisory_xact_lock(730031)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
 const applied=(await client.query('SELECT 1 FROM schema_migrations WHERE version=$1',[VERSION])).rowCount>0;
 if(rollback){
  if(!applied)return false;
  await client.query(sql(VERSION+'.down.sql'));
  await client.query('DELETE FROM schema_migrations WHERE version=$1',[VERSION]);
 }else{
  if(applied)return false;
  await client.query(sql(VERSION+'.sql'));
  await client.query('INSERT INTO schema_migrations(version) VALUES($1)',[VERSION]);
 }
 return true;
}
