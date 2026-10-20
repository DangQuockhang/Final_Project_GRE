import React,{useMemo,useState} from 'react';
import {Search,PackageSearch} from 'lucide-react';
import OrderCard from '../../components/orders/OrderCard.jsx';
import {ORDER_TRANSITIONS} from '../../utils/adminValidation.js';

export default function OrdersPanel({orders,api,perform,busy}){
 const [status,setStatus]=useState('all'),[payment,setPayment]=useState('all'),[query,setQuery]=useState('');
 const visible=useMemo(()=>orders.filter(order=>{
  if(status!=='all'&&order.status!==status)return false;
  if(payment!=='all'&&order.payment_method!==payment)return false;
  const value=[order.order_code,order.recipient,order.email,order.phone,String(order.id)].join(' ').toLowerCase();
  return value.includes(query.toLowerCase().trim());
 }),[orders,status,payment,query]);
 async function updateStatus(order,next){
  if(next==='CANCELLED'&&!window.confirm('Cancel '+order.order_code+'? Stock will be restored. Paid transfers may require a manual refund.'))return;
  await perform(()=>api('/admin/orders/'+order.id+'/status',{method:'PATCH',body:{status:next}}),
   'Order '+order.order_code+' changed to '+next+'.');
 }
 async function verifyPayment(order){
  if(!window.confirm('Have you independently checked that payment arrived in your bank account for '+order.order_code+'?'))return;
  await perform(()=>api('/admin/orders/'+order.id+'/payment',{method:'PATCH',body:{status:'PAID'}}),
   'Bank transfer verified for '+order.order_code+'.');
 }
 return <section className="kd-admin-panel kd-order-management" aria-labelledby="orders-title">
  <div className="kd-admin-panel-header"><div><h2 id="orders-title">Order Management</h2>
   <p>Review purchases, delivery details, payment status and order progress.</p></div>
   <span>{orders.length} orders</span></div>
  <div className="kd-order-management-toolbar">
   <label><Search size={19}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order code, customer or phone…" aria-label="Search orders"/></label>
   <label>STATUS <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>
    {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s=><option key={s}>{s}</option>)}</select></label>
   <label>PAYMENT <select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All methods</option>
    <option value="COD">Cash on delivery</option><option value="BANK_TRANSFER">Bank transfer</option></select></label>
  </div>
  <div className="kd-order-list">
   {visible.length?visible.map(order=><OrderCard key={order.id} order={order} admin loading={busy}
    allowedTransitions={ORDER_TRANSITIONS} onStatusChange={updateStatus} onVerifyPayment={verifyPayment}/>)
    :<div className="kd-admin-placeholder"><PackageSearch size={28}/> No orders match your filters.</div>}
  </div>
 </section>;
}
