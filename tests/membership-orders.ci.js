import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {migrateMembership} from '../server/src/membershipMigration.js';
export async function checkMembershipOrders(base,admin,brandId){
 assert.match(new URL(process.env.DATABASE_URL).pathname,/\/kd_test$/);
 const db=new pg.Pool({connectionString:process.env.DATABASE_URL}),suffix=randomUUID().slice(0,8);
 const call=async(path,token,body,method='GET')=>{
  const r=await fetch(base+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await r.json();assert.ok(!JSON.stringify(data).includes('password_hash'));return {status:r.status,data};
 };
 try{
  // A safe rollback archives tier edits and audits, then restores them on re-apply.
  const client=await db.connect();
  try{
   await client.query('BEGIN');await client.query("UPDATE membership_tiers SET benefits='[\"Kiểm tra cấu hình\"]' WHERE code='bronze'");
   assert.equal(await migrateMembership(client,{rollback:true}),true);
   assert.equal(await migrateMembership(client,{rollback:true}),false);
   assert.equal(await migrateMembership(client),true);assert.equal(await migrateMembership(client),false);
   assert.deepEqual((await client.query("SELECT benefits FROM membership_tiers WHERE code='bronze'")).rows[0].benefits,['Kiểm tra cấu hình']);
   await client.query("UPDATE membership_tiers SET benefits='[]' WHERE code='bronze'");await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await db.query('DELETE FROM auth_rate_limits');
  const register=async tag=>{const r=await call('/auth/register',null,{name:'Thành viên '+tag,email:tag+'-'+suffix+'@example.test',password:'MemberPassword2026'},'POST');assert.equal(r.status,201);return r.data;};
  const a=await register('member'),b=await register('other');
  assert.equal((await call('/account/membership')).status,401);
  const membership=async token=>{const r=await call('/account/membership',token);assert.equal(r.status,200);return r.data;};
  assert.equal((await membership(a.token)).lifetime_spend,0);
  const product=await call('/products',admin,{name:'Membership fixture '+suffix,brand_id:brandId,category:'clothing',price:2000000,status:'active'},'POST');assert.equal(product.status,201);
  const variant=await call('/products/'+product.data.id+'/variants',admin,{sku:'MEM-'+suffix,size:'M',color:'Black',stock:20},'POST');assert.equal(variant.status,201);
  const stock=async()=>Number((await db.query('SELECT stock FROM product_variants WHERE id=$1',[variant.data.id])).rows[0].stock);
  const make=async(method='COD')=>{
   const r=await call('/orders',a.token,{recipient:'Khách thành viên',phone:'0912345678',address:'12 Nguyễn Huệ, Thành phố Hồ Chí Minh',payment_method:method,items:[{variant_id:variant.data.id,quantity:1}]},'POST');assert.equal(r.status,201);return r.data;
  };
  const transition=async(order,status)=>{const r=await call('/admin/orders/'+order.id+'/status',admin,{status},'PATCH');assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
  const delivered=async(order)=>{for(const status of ['CONFIRMED','SHIPPED','DELIVERED'])order=await transition(order,status);return order;};
  const reason='Đã đối chiếu tiền thu hộ và biên nhận giao hàng.';
  const cod=await make();assert.equal(await stock(),19);
  for(const path of ['/payment','/return','/refund','/audit']){
   assert.equal((await call('/admin/orders/'+cod.id+path,a.token,path==='/audit'?undefined:{status:'PAID',reason,confirmed:true,restock:true,reference:'R-01'},path==='/audit'?'GET':path==='/payment'?'PATCH':'POST')).status,403);
  }
  assert.equal((await call('/admin/orders/'+cod.id+'/payment',admin,{status:'PAID',reason},'PATCH')).status,409);
  await delivered(cod);
  assert.equal((await membership(a.token)).lifetime_spend,0,'Delivered unpaid COD is not silently credited');
  const paidResults=await Promise.all([1,2].map(()=>call('/admin/orders/'+cod.id+'/payment',admin,{status:'PAID',reason},'PATCH')));
  assert.deepEqual(paidResults.map(r=>r.status).sort(),[200,409]);
  let member=await membership(a.token);assert.equal(member.current.code,'silver');assert.equal(member.lifetime_spend,2000000);assert.equal(member.completed_orders,1);
  const other=await call('/account/membership?user_id='+a.user.id,b.token);assert.equal(other.data.lifetime_spend,0,'User id query cannot disclose another account');
  // Configuration changes take effect without a deploy or rewriting account records.
  await db.query("UPDATE membership_tiers SET min_spend=3000000 WHERE code='silver'");
  assert.equal((await membership(a.token)).current.code,'bronze');
  await db.query("UPDATE membership_tiers SET min_spend=2000000 WHERE code='silver'");
  const returned=await Promise.all([1,2].map(()=>call('/admin/orders/'+cod.id+'/return',admin,{reason:'Đã nhận đủ hàng hoàn, kiểm tra hàng còn nguyên.',confirmed:true,restock:true},'POST')));
  assert.deepEqual(returned.map(r=>r.status).sort(),[200,409]);assert.equal(await stock(),20,'Stock restored exactly once');
  member=await membership(a.token);assert.equal(member.current.code,'bronze');assert.equal(member.lifetime_spend,0);
  const history=await call('/account/orders?status=RETURNED',a.token);assert.equal(history.data.items[0].id,cod.id);
  assert.equal(history.data.items[0].payment_status,'REFUND_PENDING');
  assert.equal((await call('/admin/orders/'+cod.id+'/refund',admin,{reason,confirmed:false,reference:'REF-'+suffix},'POST')).status,400);
  const refunds=await Promise.all([1,2].map(()=>call('/admin/orders/'+cod.id+'/refund',admin,{reason:'Đã chuyển hoàn đủ tiền, lưu biên nhận giao dịch.',confirmed:true,reference:'REF-'+suffix},'POST')));
  assert.deepEqual(refunds.map(r=>r.status).sort(),[200,409]);assert.equal(await stock(),20);
  assert.equal((await membership(a.token)).lifetime_spend,0);
  const audit=await call('/admin/orders/'+cod.id+'/audit',admin);assert.equal(audit.status,200);
  assert.equal(audit.data.items.filter(x=>x.action==='RETURN').length,1);assert.equal(audit.data.items.filter(x=>x.action==='REFUND').length,1);
  assert.equal(audit.data.items[0].reference,'REF-'+suffix);assert.ok(audit.data.items.every(x=>x.actor_id&&x.actor_name&&x.created_at));
  assert.equal((await call('/admin/orders?status=RETURNED&payment_status=REFUNDED',admin)).data.some(x=>x.id===cod.id),true);
  const bank=await make('BANK_TRANSFER');
  await transition(bank,'CANCELLED');const afterCancel=await stock();
  assert.equal((await call('/admin/orders/'+bank.id+'/payment',admin,{status:'PAID'},'PATCH')).status,409);
  assert.equal(await stock(),afterCancel);
  // No restock for damaged returns. Unpaid COD returns create no invented refund.
  const damaged=await make();await delivered(damaged);
  assert.equal((await call('/admin/orders/'+damaged.id+'/return',admin,{reason:'Đã nhận hàng hỏng, không đủ điều kiện bán lại.',confirmed:true,restock:false},'POST')).status,200);
  assert.equal(await stock(),afterCancel-1);
  assert.equal((await call('/admin/orders?id='+damaged.id,admin)).data[0].payment_status,'UNPAID');
  // Old paid completed orders count for life; cancelled, pending and returned do not.
  await db.query(`INSERT INTO orders(user_id,recipient,phone,address,total,status,payment_status,payment_method,created_at)
   VALUES($1,'History','0912345678','Historical fixture',30000000,'DELIVERED','PAID','COD','2020-01-01'),
   ($1,'History','0912345678','Historical fixture',9000000,'CANCELLED','PAID','COD','2020-01-01')`,[a.user.id]);
  assert.equal((await membership(a.token)).current.code,'platinum');assert.equal((await membership(a.token)).lifetime_spend,30000000);
  const report=await call('/admin/reports/best-sellers?search='+suffix,admin);
  assert.equal(report.status,200);assert.equal(report.data.items.some(p=>p.product_id===product.data.id),false,'Returned/cancelled products excluded from rankings');
  const dashboard=await call('/admin/dashboard',admin);
  const expected=(await db.query(`SELECT COALESCE(sum(total) FILTER(WHERE status NOT IN ('CANCELLED','RETURNED') AND payment_status='PAID'),0)::float8 AS paid
   FROM orders WHERE created_at >= $1 AND created_at < $2`,[dashboard.data.range.start,dashboard.data.range.end])).rows[0];
  assert.equal(dashboard.data.current.paid_value,expected.paid);
  const check=await db.connect();
  try{
   await check.query('BEGIN');
   await assert.rejects(()=>migrateMembership(check,{rollback:true}),/Rollback blocked/);
   await check.query('ROLLBACK');
   assert.equal((await check.query("SELECT count(*)::int AS n FROM schema_migrations WHERE version='004_membership_orders'")).rows[0].n,1);
   // Rerunning the legacy initializer must not reject new financial states.
   await check.query('BEGIN');
   await check.query(readFileSync(new URL('../server/sql/001_schema.sql',import.meta.url),'utf8'));
   assert.equal(await migrateMembership(check),false);await check.query('COMMIT');
  }catch(e){await check.query('ROLLBACK');throw e;}finally{check.release();}
 }finally{await db.end();}
}
