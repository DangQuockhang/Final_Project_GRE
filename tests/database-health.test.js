import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {requiredSchema,inspectDatabase,databaseHealthHandler} from '../server/src/databaseHealth.js';

const complete = Object.entries(requiredSchema).flatMap(([table,columns]) => (columns.length?columns:['id']).map(column=>({table_name:table,column_name:column})));
test('schema check distinguishes empty, legacy, incomplete and current database', async()=>{
 const empty=await inspectDatabase(async()=>({rows:[]}));
 assert.equal(empty.ready,false);assert(empty.missingTables.includes('products'));
 const legacy=await inspectDatabase(async()=>({rows:complete.filter(r=>['brands','users','products','orders','order_items','product_variants'].includes(r.table_name))}));
 assert.equal(legacy.ready,false);assert(legacy.missingTables.includes('collections'));
 const missingColumn=await inspectDatabase(async()=>({rows:complete.filter(r=>r.table_name!=='products'||r.column_name!=='collection_id')}));
 assert.deepEqual(missingColumn.missingColumns,['products.collection_id']);
 assert.equal((await inspectDatabase(async()=>({rows:complete}))).ready,true);
});
test('HTTP health returns 503 for empty or unavailable DB without exposing credentials',async()=>{
 let query=async()=>({rows:[]});
 const app=express();app.get('/api/health',databaseHealthHandler((...args)=>query(...args)));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/health`;
 try {
  let res=await fetch(url);assert.equal(res.status,503);assert.equal((await res.json()).code,'DATABASE_SCHEMA_NOT_READY');
  query=async()=>{throw new Error('postgres://secret:password@private/db');};
  res=await fetch(url);assert.equal(res.status,503);assert.equal((await res.json()).code,'DATABASE_UNAVAILABLE');
  query=async()=>({rows:complete});res=await fetch(url);assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{ok:true,service:'kd-api'});assert.equal(res.headers.get('cache-control'),'no-store');
 } finally {await new Promise(resolve=>server.close(resolve));}
});
