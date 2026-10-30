const DAY=86400000;
export function dashboardWindow(value='30',now=new Date()){
 const days=Number(value);
 if(![7,30,90].includes(days)){const error=new Error('Choose 7, 30 or 90 days.');error.status=400;throw error;}
 const end=new Date(now),local=new Date(end.getTime()+7*3600000);
 const today=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-7*3600000;
 const start=new Date(today-(days-1)*DAY);
 return {days,start,end,previousStart:new Date(start.getTime()-days*DAY),previousEnd:new Date(end.getTime()-days*DAY)};
}
export async function loadDashboard(pool,value){
 const w=dashboardWindow(value),c=await pool.connect();
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const params=[w.start,w.end,w.previousStart,w.previousEnd];
  const metrics=await c.query(`
   WITH periods AS (SELECT 'current' AS period,$1::timestamptz AS a,$2::timestamptz AS b
    UNION ALL SELECT 'previous',$3::timestamptz,$4::timestamptz)
   SELECT t.period,count(o.id)::int AS orders,
    count(o.id) FILTER(WHERE o.status!='CANCELLED')::int AS valid_orders,
    count(DISTINCT o.user_id) FILTER(WHERE o.status!='CANCELLED')::int AS customers,
    COALESCE(sum(o.total) FILTER(WHERE o.status!='CANCELLED'),0)::float8 AS order_value,
    COALESCE(sum(o.total) FILTER(WHERE o.status!='CANCELLED' AND o.payment_status='PAID'),0)::float8 AS paid_value
   FROM periods t LEFT JOIN orders o ON o.created_at>=t.a AND o.created_at<t.b GROUP BY t.period`,params);
  const trend=await c.query(`
   SELECT to_char(d.day,'YYYY-MM-DD') AS day,
    count(o.id)::int AS orders,
    COALESCE(sum(o.total) FILTER(WHERE o.status!='CANCELLED' AND o.payment_status='PAID'),0)::float8 AS paid_value
   FROM generate_series(($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
    ($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'1 day') AS d(day)
   LEFT JOIN orders o ON (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=d.day::date
    AND o.created_at >= $1 AND o.created_at < $2
   GROUP BY d.day ORDER BY d.day`,[w.start,w.end]);
  const pipeline=await c.query(`SELECT status,count(*)::int AS count FROM orders
   WHERE created_at >= $1 AND created_at < $2 GROUP BY status`,[w.start,w.end]);
  const operations=(await c.query(`SELECT
   (SELECT count(*)::int FROM orders WHERE status='PENDING') AS pending,
   (SELECT count(*)::int FROM orders WHERE status='CONFIRMED') AS to_ship,
   (SELECT count(*)::int FROM orders WHERE payment_status='AWAITING_TRANSFER' AND status!='CANCELLED') AS awaiting_transfer,
   (SELECT count(*)::int FROM orders WHERE payment_status='REFUND_PENDING') AS refunds,
   (SELECT count(*)::int FROM products WHERE status='active') AS active_products,
   (SELECT count(*)::int FROM products WHERE status='draft') AS draft_products,
   (SELECT count(*)::int FROM products WHERE status='active' AND image_url IS NULL) AS missing_cover,
   (SELECT count(*)::int FROM products p WHERE p.status='active' AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id)) AS missing_skus,
   (SELECT count(*)::int FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.status='active' AND v.stock BETWEEN 1 AND 3) AS low_stock,
   (SELECT count(*)::int FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.status='active' AND v.stock=0) AS out_of_stock
  `)).rows[0];
  const lowStock=await c.query(`SELECT p.id AS product_id,p.name,p.image_url,v.sku,v.size,v.color,v.stock
   FROM product_variants v JOIN products p ON p.id=v.product_id
   WHERE p.status='active' AND v.stock<=3 ORDER BY v.stock,p.id,v.id LIMIT 8`);
  const topProducts=await c.query(`SELECT p.id AS product_id,p.name,
   sum(i.quantity)::int AS units,sum(i.quantity*i.unit_price::bigint)::float8 AS value
   FROM order_items i JOIN orders o ON o.id=i.order_id JOIN product_variants v ON v.id=i.variant_id
   JOIN products p ON p.id=v.product_id
   WHERE o.created_at >= $1 AND o.created_at < $2 AND o.status!='CANCELLED'
   GROUP BY p.id ORDER BY units DESC,value DESC,p.id LIMIT 5`,[w.start,w.end]);
  const recent=await c.query(`SELECT id,order_code,recipient,total,status,payment_status,created_at
   FROM orders ORDER BY created_at DESC,id DESC LIMIT 6`);
  await c.query('COMMIT');
  return {days:w.days,timezone:'Asia/Ho_Chi_Minh',generated_at:w.end.toISOString(),
   range:{start:w.start.toISOString(),end:w.end.toISOString(),previous_start:w.previousStart.toISOString(),previous_end:w.previousEnd.toISOString()},
   current:metrics.rows.find(x=>x.period==='current'),previous:metrics.rows.find(x=>x.period==='previous'),
   trend:trend.rows,pipeline:pipeline.rows,operations,low_stock:lowStock.rows,top_products:topProducts.rows,recent_orders:recent.rows};
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
