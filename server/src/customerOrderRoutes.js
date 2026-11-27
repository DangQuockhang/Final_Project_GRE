import {orderItemsJson} from './orderQueries.js';
const PAGE_SIZE=10;
export function customerOrderFilter(query={}){
 const raw=query.page??'1',status=query.status??'all';
 if(typeof raw!=='string'||!/^[1-9][0-9]{0,6}$/.test(raw)||typeof status!=='string'||!['all','PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','RETURNED'].includes(status)){
  const error=new Error('Trang hoặc trạng thái đơn hàng không hợp lệ.');error.status=400;error.code='VALIDATION_ERROR';throw error;
 }
 return {page:Number(raw),status};
}
export function registerCustomerOrders(route,{pool,authorize}){
 route.get('/account/orders',authorize,async(req,res,next)=>{
  let client;
  try{
   const filter=customerOrderFilter(req.query),values=[req.user.id];
   let where='o.user_id=$1';
   if(filter.status!=='all'){values.push(filter.status);where+=' AND o.status=$2';}
   client=await pool.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const total=(await client.query('SELECT count(*)::int AS total FROM orders o WHERE '+where,values)).rows[0].total;
   const pages=Math.ceil(total/PAGE_SIZE),page=Math.min(filter.page,Math.max(1,pages));
   const parameters=[...values,PAGE_SIZE,(page-1)*PAGE_SIZE];
   const items=total?(await client.query('SELECT o.*,'+orderItemsJson+' AS items FROM orders o WHERE '+where+
    ' ORDER BY o.created_at DESC,o.id DESC LIMIT $'+(parameters.length-1)+' OFFSET $'+parameters.length,parameters)).rows:[];
   await client.query('COMMIT');res.set('Cache-Control','no-store');
   res.json({items,pagination:{page,page_size:PAGE_SIZE,total,pages}});
  }catch(error){if(client)await client.query('ROLLBACK');next(error);}finally{client?.release();}
 });
}
