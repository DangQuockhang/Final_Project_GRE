import {dashboardWindow} from './dashboard.js';
const PAGE_SIZE=25;
const orderStates=['all','PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'];
const paymentStates=['all','UNPAID','AWAITING_TRANSFER','PAID','REFUND_PENDING'];
const invalid=message=>{const error=new Error(message);error.status=400;throw error;};
function choice(query,key,values,fallback){
 const value=query[key]??fallback;
 if(typeof value!=='string'||!values.includes(value))invalid('Bộ lọc '+key+' không hợp lệ.');
 return value;
}
export function reportQuery(kind,query={},now=new Date()){
 if(!['orders','inventory','best-sellers','catalog-health'].includes(kind)){
  const error=new Error('Không tìm thấy báo cáo.');error.status=404;throw error;
 }
 const rawPage=query.page??'1';
 if(typeof rawPage!=='string'||! /^[1-9][0-9]{0,6}$/.test(rawPage))invalid('Trang không hợp lệ.');
 const search=query.search??'';
 if(typeof search!=='string'||search.length>120)invalid('Tìm kiếm tối đa 120 ký tự.');
 const values=[],where=[],bind=value=>{values.push(value);return '$'+values.length;};
 const match=columns=>{
  if(!search.trim())return;
  // Treat %, _ and backslash as literal search text, never SQL wildcards.
  const escaped=search.trim().replace(/[\\%_]/g,value=>'\\'+value);
  const parameter=bind('%'+escaped+'%');
  where.push('('+columns.map(column=>column+' ILIKE '+parameter).join(' OR ')+')');
 };
 let source,sort,summary,range=null;
 if(kind==='orders'){
  const status=choice(query,'status',orderStates,'all');
  const payment=choice(query,'payment_status',paymentStates,'all');
  const method=choice(query,'payment_method',['all','COD','BANK_TRANSFER'],'all');
  const days=choice(query,'days',['all','7','30','90'],'all');
  if(status!=='all')where.push('o.status='+bind(status));
  if(payment!=='all')where.push('o.payment_status='+bind(payment));
  if(method!=='all')where.push('o.payment_method='+bind(method));
  if(days!=='all'){range=dashboardWindow(days,now);where.push('o.created_at>='+bind(range.start)+' AND o.created_at<'+bind(range.end));}
  match(['o.order_code','o.recipient','u.email','o.phone']);
  source="SELECT o.id,o.order_code,o.recipient,o.phone,u.email,o.created_at,o.total,o.status,o.payment_method,o.payment_status,"+
   "(SELECT COALESCE(sum(quantity),0)::int FROM order_items WHERE order_id=o.id) AS item_count FROM orders o JOIN users u ON u.id=o.user_id";
  sort=choice(query,'sort',['newest','oldest'],'newest')==='newest'?'created_at DESC,id DESC':'created_at,id';
  summary="count(*)::int AS total,count(*) FILTER(WHERE status='PENDING')::int AS pending,"+
   "count(*) FILTER(WHERE payment_status='AWAITING_TRANSFER' AND status!='CANCELLED')::int AS awaiting_transfer";
 }else if(kind==='inventory'){
  where.push("p.status='active'");
  const filter=choice(query,'filter',['attention','all','sold_out','low_stock','in_stock'],'attention');
  const conditions={attention:'v.stock<=3',sold_out:'v.stock=0',low_stock:'v.stock BETWEEN 1 AND 3',in_stock:'v.stock>3'};
  if(conditions[filter])where.push(conditions[filter]);
  match(['p.name','b.name','v.sku','v.color','v.size']);
  source="SELECT v.id,p.id AS product_id,p.name,b.name AS brand_name,p.image_url,v.sku,v.color,v.size,v.stock "+
   "FROM product_variants v JOIN products p ON p.id=v.product_id JOIN brands b ON b.id=p.brand_id";
  sort=choice(query,'sort',['stock_asc','stock_desc'],'stock_asc')==='stock_asc'?'stock,name,id':'stock DESC,name,id';
  summary="count(*)::int AS total,COALESCE(sum(stock),0)::float8 AS units,"+
   "count(*) FILTER(WHERE stock=0)::int AS sold_out,count(*) FILTER(WHERE stock BETWEEN 1 AND 3)::int AS low_stock";
 }else if(kind==='catalog-health'){
  const filter=choice(query,'filter',['issues','all','active','draft','archived','missing_cover','missing_skus'],'issues');
  const missingSku="NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id)";
  const conditions={issues:"(p.status='draft' OR (p.status='active' AND (p.image_url IS NULL OR "+missingSku+")))",
   active:"p.status='active'",draft:"p.status='draft'",archived:"p.status='archived'",
   missing_cover:"p.status='active' AND p.image_url IS NULL",missing_skus:"p.status='active' AND "+missingSku};
  if(conditions[filter])where.push('('+conditions[filter]+')');
  match(['p.name','b.name','p.product_type']);
  source="SELECT p.id AS product_id,p.name,b.name AS brand_name,p.status,p.category,p.product_type,p.image_url,p.price,"+
   "(SELECT count(*)::int FROM product_variants v WHERE v.product_id=p.id) AS variant_count,"+
   "(SELECT COALESCE(sum(stock),0)::float8 FROM product_variants v WHERE v.product_id=p.id) AS stock "+
   "FROM products p JOIN brands b ON b.id=p.brand_id";
  sort='product_id DESC';
  summary="count(*)::int AS total,count(*) FILTER(WHERE status='draft')::int AS drafts,"+
   "count(*) FILTER(WHERE status='active' AND image_url IS NULL)::int AS missing_cover,"+
   "count(*) FILTER(WHERE status='active' AND variant_count=0)::int AS missing_skus";
 }else{
  const days=choice(query,'days',['7','30','90'],'30');range=dashboardWindow(days,now);
  where.push('o.created_at>='+bind(range.start)+' AND o.created_at<'+bind(range.end),"o.status!='CANCELLED'");
  match(['p.name','b.name']);
  source="SELECT p.id AS product_id,p.name,b.name AS brand_name,p.image_url,p.status,"+
   "sum(i.quantity)::int AS units,count(DISTINCT o.id)::int AS order_count,"+
   "sum(i.quantity*i.unit_price::bigint)::float8 AS value,"+
   "COALESCE(sum(i.quantity*i.unit_price::bigint) FILTER(WHERE o.payment_status='PAID'),0)::float8 AS paid_value "+
   "FROM order_items i JOIN orders o ON o.id=i.order_id JOIN product_variants v ON v.id=i.variant_id "+
   "JOIN products p ON p.id=v.product_id JOIN brands b ON b.id=p.brand_id";
  sort=choice(query,'sort',['units','value'],'units')==='units'?'units DESC,value DESC,product_id':'value DESC,units DESC,product_id';
  summary="count(*)::int AS total,COALESCE(sum(units),0)::float8 AS units,COALESCE(sum(value),0)::float8 AS value";
 }
 if(where.length)source+=' WHERE '+where.join(' AND ');
 if(kind==='best-sellers')source+=' GROUP BY p.id,b.name';
 return {source,values,sort,summary,page:Number(rawPage),range};
}
export async function loadAdminReport(pool,kind,query){
 const plan=reportQuery(kind,query),client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const summary=(await client.query('SELECT '+plan.summary+' FROM ('+plan.source+') AS matched',plan.values)).rows[0];
  const pages=Math.ceil(summary.total/PAGE_SIZE),page=Math.min(plan.page,Math.max(1,pages));
  const values=[...plan.values,PAGE_SIZE,(page-1)*PAGE_SIZE];
  const rows=summary.total?(await client.query('SELECT * FROM ('+plan.source+') AS matched ORDER BY '+plan.sort+
   ' LIMIT $'+(values.length-1)+' OFFSET $'+values.length,values)).rows:[];
  await client.query('COMMIT');
  return {kind,items:rows,summary,pagination:{page,page_size:PAGE_SIZE,total:summary.total,pages},
   range:plan.range?{start:plan.range.start.toISOString(),end:plan.range.end.toISOString(),days:plan.range.days}:null};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
