const fail=(message,status=400)=>{const e=new Error(message);e.status=status;e.code=status===409?'ORDER_CONFLICT':'VALIDATION_ERROR';throw e;};
export function actionReason(value){
 if(typeof value!=='string'||value.trim().length<10||value.trim().length>500||/[\x00-\x1f\x7f]/.test(value))fail('Vui lòng nhập lý do từ 10 đến 500 ký tự.');
 return value.trim();
}
export function orderAction(order,kind,body={}){
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Dữ liệu thao tác không hợp lệ.');
 let status=order.status,payment=order.payment_status,reason='',reference=null,restocked=false;
 if(kind==='STATUS'){
  const transitions={PENDING:['CONFIRMED','CANCELLED'],CONFIRMED:['SHIPPED','CANCELLED'],SHIPPED:['DELIVERED'],DELIVERED:[],CANCELLED:[],RETURNED:[]};
  if(!['CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].includes(body.status))fail('Trạng thái không hợp lệ.');
  if(!transitions[status]?.includes(body.status))fail('Đơn đã thay đổi hoặc không thể chuyển sang trạng thái này.',409);
  if(body.status==='CONFIRMED'&&order.payment_method==='BANK_TRANSFER'&&payment!=='PAID')fail('Hãy xác nhận đã nhận chuyển khoản trước khi xác nhận đơn.',409);
  status=body.status;restocked=status==='CANCELLED';
  if(status==='CANCELLED'&&payment==='PAID')payment='REFUND_PENDING';
  reason='Order status updated: '+status;
 }else if(kind==='PAYMENT'){
  if(body.status!=='PAID')fail('Trạng thái thanh toán không hợp lệ.');
  const bank=order.payment_method==='BANK_TRANSFER'&&payment==='AWAITING_TRANSFER'&&!['CANCELLED','RETURNED'].includes(status);
  const cash=order.payment_method==='COD'&&payment==='UNPAID'&&status==='DELIVERED';
  if(!bank&&!cash)fail('Đơn không đủ điều kiện xác nhận thanh toán hoặc đã được xử lý.',409);
  reason=cash?actionReason(body.reason):(body.reason===undefined?'Admin verified receipt of the bank transfer.':actionReason(body.reason));payment='PAID';
 }else if(kind==='RETURN'){
  if(status!=='DELIVERED')fail('Chỉ ghi nhận hoàn trả toàn bộ đơn đã giao.',409);
  reason=actionReason(body.reason);
  if(body.confirmed!==true||typeof body.restock!=='boolean')fail('Xác nhận đã nhận hàng hoàn và chọn có nhập lại kho hay không.');
  status='RETURNED';restocked=body.restock;if(payment==='PAID')payment='REFUND_PENDING';
 }else if(kind==='REFUND'){
  if(!['CANCELLED','RETURNED'].includes(status)||payment!=='REFUND_PENDING')fail('Đơn không có khoản hoàn tiền đang chờ xử lý.',409);
  reason=actionReason(body.reason);
  if(body.confirmed!==true||typeof body.reference!=='string'||body.reference.trim().length<3||body.reference.trim().length>120||/[\x00-\x1f\x7f]/.test(body.reference))fail('Xác nhận đã hoàn tiền và nhập mã tham chiếu từ 3 đến 120 ký tự.');
  payment='REFUNDED';reference=body.reference.trim();
 }else fail('Thao tác không hợp lệ.');
 return {status,payment_status:payment,reason,reference,restocked};
}
export function registerOrderLifecycle(route,{pool,authorize,admin}){
 const apply=kind=>async(req,res,next)=>{
  let client;
  try{
   if(!/^[1-9]\d{0,9}$/.test(req.params.id))fail('Mã đơn không hợp lệ.');
   client=await pool.connect();await client.query('BEGIN');
   const order=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
   if(!order)fail('Không tìm thấy đơn hàng.',404);
   const change=orderAction(order,kind,req.body);
   if(change.restocked){
    // Stable lock order prevents two overlapping orders from deadlocking during restock.
    const lines=(await client.query('SELECT variant_id,sum(quantity)::int AS quantity FROM order_items WHERE order_id=$1 GROUP BY variant_id ORDER BY variant_id',[order.id])).rows;
    for(const line of lines)await client.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2',[line.quantity,line.variant_id]);
   }
   const updated=(await client.query('UPDATE orders SET status=$1,payment_status=$2 WHERE id=$3 RETURNING *',[change.status,change.payment_status,order.id])).rows[0];
   await client.query(`INSERT INTO order_action_audit(order_id,actor_id,action,reason,reference,restocked,before_state,after_state)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[order.id,req.user.id,kind,change.reason,change.reference,change.restocked,
    {status:order.status,payment_status:order.payment_status},{status:updated.status,payment_status:updated.payment_status}]);
   await client.query('COMMIT');res.json(updated);
  }catch(error){if(client)await client.query('ROLLBACK');next(error);}finally{client?.release();}
 };
 route.patch('/admin/orders/:id/status',authorize,admin,apply('STATUS'));
 route.patch('/admin/orders/:id/payment',authorize,admin,apply('PAYMENT'));
 route.post('/admin/orders/:id/return',authorize,admin,apply('RETURN'));
 route.post('/admin/orders/:id/refund',authorize,admin,apply('REFUND'));
 route.get('/admin/orders/:id/audit',authorize,admin,async(req,res,next)=>{
  try{
   if(!/^[1-9]\d{0,9}$/.test(req.params.id))fail('Mã đơn không hợp lệ.');
   const found=(await pool.query('SELECT id FROM orders WHERE id=$1',[req.params.id])).rowCount;
   if(!found)fail('Không tìm thấy đơn hàng.',404);
   const events=(await pool.query(`SELECT a.id,a.action,a.reason,a.reference,a.restocked,a.before_state,a.after_state,a.created_at,
    a.actor_id,u.name AS actor_name FROM order_action_audit a JOIN users u ON u.id=a.actor_id WHERE order_id=$1 ORDER BY a.id DESC`,[req.params.id])).rows;
   res.set('Cache-Control','no-store').json({items:events});
  }catch(error){next(error);}
 });
}
