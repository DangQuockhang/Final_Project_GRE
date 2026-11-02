import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import pg from 'pg';
import {migrateAccountFoundation} from '../server/src/accountMigration.js';
export async function checkAccountFoundation(base,brandId){
 assert.match(new URL(process.env.DATABASE_URL).pathname,/\/kd_test$/);
 const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const suffix=randomUUID().slice(0,8),password='FoundationPassword2026',email='foundation-'+suffix+'@example.test';
 const call=async(path,{token,body,method='GET'}={})=>{
  const response=await fetch(base+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json();assert.equal(JSON.stringify(data).includes('password_hash'),false);return {status:response.status,data};
 };
 const address={recipient:'Nguyễn An',phone:'+84 (912) 345-678',address:'12 Nguyễn Huệ, Phường Bến Nghé, TP.HCM'};
 let saved,user,token,second;
 try{
  await db.query('DELETE FROM auth_rate_limits');
  for(const secret of ['', 'too-short']){
   const startup=spawnSync(process.execPath,['src/index.js'],{cwd:resolve('server'),env:{...process.env,JWT_SECRET:secret,PORT:'4012'},encoding:'utf8',timeout:10000});
   assert.equal(startup.status,1);assert.match(startup.stderr,/JWT_SECRET/);
   if(secret)assert.equal(startup.stderr.includes(secret),false,'Never echo the configured signing secret');
  }
  const registered=await call('/auth/register',{method:'POST',body:{name:'Nguyễn An',email,password}});
  assert.equal(registered.status,201);user=registered.data.user;token=registered.data.token;
  const login=await call('/auth/login',{method:'POST',body:{email,password}});assert.equal(login.status,200);second=login.data.token;
  assert.notEqual(token,second,'Each login has its own revocable token, even in the same second');
  const other=await call('/auth/register',{method:'POST',body:{name:'Khách khác',email:'other-'+email,password}});
  assert.equal(other.status,201);
  assert.equal((await call('/auth/address')).status,401);
  assert.equal((await call('/account/orders')).status,401);
  assert.equal((await call('/auth/address',{token})).data.address,null);
  assert.equal((await call('/auth/address',{token,method:'PUT',body:{...address,user_id:other.data.user.id}})).status,400);
  const invalid=await call('/auth/address',{token,method:'PUT',body:{...address,phone:'abcdefghijk'}});
  assert.equal(invalid.status,400);assert.ok(invalid.data.errors.phone);
  saved=await call('/auth/address',{token,method:'PUT',body:address});
  assert.equal(saved.status,200);assert.equal(saved.data.address.phone,'+84912345678');
  assert.equal((await call('/auth/address',{token:other.data.token})).data.address,null);
  assert.equal((await call('/auth/address?user_id='+other.data.user.id,{token})).data.address.recipient,address.recipient);
  const concurrent=await Promise.all([call('/auth/address',{token,method:'PUT',body:address}),call('/auth/address',{token,method:'PUT',body:{...address,recipient:'Nguyễn Bình'}})]);
  assert.ok(concurrent.every(r=>r.status===200));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM account_default_addresses WHERE user_id=$1',[user.id])).rows[0].n,1);
  await call('/auth/address',{token,method:'PUT',body:address});
  const product=(await db.query("INSERT INTO products(name,slug,brand_id,category,price,status) VALUES($1,$2,$3,'clothing',130000,'active') RETURNING id",['Foundation product '+suffix,'foundation-'+suffix,brandId])).rows[0];
  const variant=(await db.query("INSERT INTO product_variants(product_id,sku,size,color,stock) VALUES($1,$2,'M','Standard',100) RETURNING id",[product.id,'FOUNDATION-'+suffix])).rows[0];
  await db.query("INSERT INTO orders(user_id,recipient,phone,address,total,status,created_at) SELECT $1,'Nguyễn An','0912345678','Original order address',260000,CASE WHEN n%2=0 THEN 'DELIVERED' ELSE 'PENDING' END,now()-n*interval '1 minute' FROM generate_series(1,23) n",[user.id]);
  await db.query("INSERT INTO order_items(order_id,variant_id,product_name,sku,size,quantity,unit_price) SELECT id,$2,'Foundation product',$3,'M',2,130000 FROM orders WHERE user_id=$1",[user.id,variant.id,'FOUNDATION-'+suffix]);
  await db.query("INSERT INTO orders(user_id,recipient,phone,address,total) VALUES($1,'Other customer','0912345678','Private other address',130000)",[other.data.user.id]);
  const first=await call('/account/orders?page=1',{token}),last=await call('/account/orders?page=3',{token});
  assert.equal(first.status,200);assert.equal(first.data.pagination.total,23);assert.equal(first.data.items.length,10);assert.equal(last.data.items.length,3);
  assert.ok(first.data.items.every(row=>row.user_id===user.id&&row.items.length===1));
  assert.ok(last.data.items.every(row=>!first.data.items.some(x=>x.id===row.id)));
  assert.equal((await call('/account/orders?page=999',{token})).data.pagination.page,3);
  assert.equal((await call('/account/orders?status=DELIVERED',{token})).data.pagination.total,11);
  assert.equal((await call('/account/orders?status=CANCELLED',{token})).data.items.length,0);
  assert.equal((await call('/account/orders?user_id='+other.data.user.id,{token})).data.pagination.total,23,'Query parameters cannot select another customer');
  assert.equal((await call('/account/orders?page=0',{token})).status,400);
  assert.equal((await call('/account/orders?status=INVALID',{token})).status,400);
  assert.equal((await call('/orders/mine',{token})).data.length,23,'Legacy history endpoint remains compatible');
  const body={...address,items:[{variant_id:variant.id,quantity:1}],payment_method:'COD'};
  const badCheckout=await call('/orders',{token,method:'POST',body:{...body,phone:'abcdefghijkl'}});
  assert.equal(badCheckout.status,400);assert.ok(badCheckout.data.errors.phone);
  assert.equal((await call('/orders',{token,method:'POST',body:{...body,recipient:'a'.repeat(121)}})).status,400);
  assert.equal((await db.query('SELECT stock FROM product_variants WHERE id=$1',[variant.id])).rows[0].stock,100);
  const order=await call('/orders',{token,method:'POST',body});assert.equal(order.status,201);assert.equal(order.data.phone,'+84912345678');
  await call('/auth/address',{token,method:'PUT',body:{...address,address:'99 Lê Lợi, Phường Bến Thành, TP.HCM'}});
  await call('/auth/address',{token,method:'DELETE'});
  assert.equal((await call('/auth/address',{token})).data.address,null);
  assert.equal((await db.query('SELECT address FROM orders WHERE id=$1',[order.data.id])).rows[0].address,address.address,'Editing or deleting default address preserves order snapshot');
  saved=await call('/auth/address',{token,method:'PUT',body:address});
  assert.equal((await call('/auth/logout',{token,method:'POST'})).status,200);
  assert.equal((await call('/auth/address',{token})).status,401);
  assert.equal((await call('/account/orders',{token})).status,401);
  assert.equal((await call('/auth/me',{token:second})).status,200,'Logging out one session preserves another session');
  const revoked=(await db.query('SELECT token_hash FROM auth_revoked_tokens WHERE user_id=$1',[user.id])).rows[0];
  assert.equal(revoked.token_hash,createHash('sha256').update(token).digest('hex'));
  // Exercise rollback and re-apply only in the disposable CI database, with no API requests between them.
  const client=await db.connect();
  try{
   await client.query('BEGIN');assert.equal(await migrateAccountFoundation(client,{rollback:true}),true);await client.query('COMMIT');
   assert.equal((await client.query('SELECT address FROM rollback_003_account_default_addresses WHERE user_id=$1',[user.id])).rows[0].address,address.address);
   await client.query('BEGIN');assert.equal(await migrateAccountFoundation(client),true);await client.query('COMMIT');
   await client.query('BEGIN');assert.equal(await migrateAccountFoundation(client),false);await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal((await call('/auth/me',{token:second})).status,401,'Rollback revokes old sessions before the old API can accept them');
  const fresh=await call('/auth/login',{method:'POST',body:{email,password}});assert.equal(fresh.status,200);
  assert.equal((await call('/auth/address',{token:fresh.data.token})).data.address.address,address.address,'Re-apply restores the saved address');
 }finally{await db.end();}
}
