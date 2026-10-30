import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
export async function checkAdminReports(base,adminToken,userToken,userId,brandId){
 const request=async(path,token=adminToken)=>{
  const response=await fetch(base+'/api/admin/reports/'+path,{headers:token?{Authorization:'Bearer '+token}:{}});
  return {status:response.status,data:await response.json()};
 };
 const db=new pg.Pool({connectionString:process.env.DATABASE_URL}),suffix=randomUUID().slice(0,8),name='Report inventory '+suffix;
 try{
  for(const report of ['orders','inventory','best-sellers','catalog-health']){
   assert.equal((await request(report,null)).status,401);
   assert.equal((await request(report,userToken)).status,403);
  }
  assert.equal((await request('orders?page=0')).status,400);
  assert.equal((await request('inventory?filter=invalid')).status,400);
  assert.equal((await request('best-sellers?days=999')).status,400);
  assert.equal((await request('unknown')).status,404);
  const orders=await request('orders?search=Dashboard+fixture');
  assert.equal(orders.status,200);assert.equal(orders.data.pagination.total,105);assert.equal(orders.data.items.length,25);
  const last=await request('orders?search=Dashboard+fixture&page=5');
  assert.equal(last.data.items.length,5);
  assert.ok(last.data.items.every(row=>!orders.data.items.some(first=>first.id===row.id)));
  assert.equal((await request('orders?search=Dashboard+fixture&page=999')).data.pagination.page,5);
  assert.equal((await request('orders?search=%25%27+OR+1%3D1--')).data.pagination.total,0);
  const product=(await db.query("INSERT INTO products(name,slug,brand_id,category,price,status) VALUES($1,$2,$3,'clothing',100000,'active') RETURNING id",[name,'report-'+suffix,brandId])).rows[0];
  await db.query("INSERT INTO product_variants(product_id,sku,size,color,stock) SELECT $1,'REPORT-'||$2||'-'||n,'S'||n,'Standard',n%6 FROM generate_series(1,31) AS n",[product.id,suffix]);
  const search='?search='+encodeURIComponent(name);
  const inventory=await request('inventory'+search+'&filter=all');
  assert.equal(inventory.data.pagination.total,31);assert.equal(inventory.data.items.length,25);
  assert.equal((await request('inventory'+search+'&filter=all&page=2')).data.items.length,6);
  const attention=await request('inventory'+search);
  assert.equal(attention.data.pagination.total,21);
  assert.ok(attention.data.items.every(row=>row.stock<=3));
  const soldOut=await request('inventory'+search+'&filter=sold_out');
  assert.equal(soldOut.data.pagination.total,5);assert.ok(soldOut.data.items.every(row=>row.stock===0));
  const cover=await request('catalog-health'+search+'&filter=missing_cover');
  assert.equal(cover.data.pagination.total,1);assert.equal(cover.data.items[0].variant_count,31);
  assert.equal((await request('catalog-health'+search+'&filter=missing_skus')).data.pagination.total,0);
  const draftPrefix='Report draft '+suffix;
  await db.query("INSERT INTO products(name,slug,brand_id,category,price,status) SELECT $1||' '||n,'report-draft-'||$2||'-'||n,$3,'accessories',100000,'draft' FROM generate_series(1,27) AS n",[draftPrefix,suffix,brandId]);
  const drafts=await request('catalog-health?search='+encodeURIComponent(draftPrefix)+'&filter=draft&page=2');
  assert.equal(drafts.data.pagination.total,27);assert.equal(drafts.data.items.length,2);
  const variant=inventory.data.items[0];
  for(const [status,payment,quantity] of [['DELIVERED','PAID',2],['CONFIRMED','UNPAID',3],['CANCELLED','PAID',9]]){
   const order=(await db.query("INSERT INTO orders(user_id,recipient,phone,address,total,status,payment_method,payment_status,created_at) VALUES($1,'Report buyer','0900000000','Report test address',$2,$3,'COD',$4,now()-interval '1 hour') RETURNING id",[userId,quantity*100000,status,payment])).rows[0];
   await db.query("INSERT INTO order_items(order_id,variant_id,product_name,sku,size,quantity,unit_price) VALUES($1,$2,$3,$4,$5,$6,100000)",[order.id,variant.id,'Historical product name',variant.sku,variant.size,quantity]);
  }
  const ranking=await request('best-sellers'+search+'&days=7');
  assert.equal(ranking.status,200);assert.equal(ranking.data.pagination.total,1);
  assert.equal(ranking.data.items[0].units,5);assert.equal(ranking.data.items[0].order_count,2);
  assert.equal(ranking.data.items[0].value,500000);assert.equal(ranking.data.items[0].paid_value,200000);
  assert.equal(ranking.data.items[0].name,name);
 }finally{await db.end();}
}
