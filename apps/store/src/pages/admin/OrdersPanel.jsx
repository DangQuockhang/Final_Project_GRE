import React,{useMemo,useState} from 'react';
import {Search,PackageSearch} from 'lucide-react';
import OrderCard from '../../components/orders/OrderCard.jsx';
import {ORDER_TRANSITIONS} from '../../utils/adminValidation.js';

export default function OrdersPanel({orders,api,perform,busy,initialStatus='all',initialPaymentStatus='all',initialOrderId=null}){
 const [status,setStatus]=useState(initialStatus),[payment,setPayment]=useState('all'),[query,setQuery]=useState('');
 const [paymentStatus,setPaymentStatus]=useState(initialPaymentStatus);
 const visible=useMemo(()=>orders.filter(order=>{
  if(initialOrderId&&String(order.id)!==String(initialOrderId))return false;
  if(paymentStatus!=='all'&&order.payment_status!==paymentStatus)return false;
  if(status!=='all'&&order.status!==status)return false;
  if(payment!=='all'&&order.payment_method!==payment)return false;
  const value=[order.order_code,order.recipient,order.email,order.phone,String(order.id)].join(' ').toLowerCase();
  return value.includes(query.toLowerCase().trim());
 }),[orders,status,payment,query,paymentStatus,initialOrderId]);
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
   <span>{visible.length} matching loaded orders</span></div>
  <div className="kd-order-management-toolbar">
   <label><Search size={19}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order code, customer or phone…" aria-label="Search orders"/></label>
   <label>STATUS <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>
    {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s=><option key={s}>{s}</option>)}</select></label>
   <label>PAYMENT <select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All methods</option>
    <option value="COD">Cash on delivery</option><option value="BANK_TRANSFER">Bank transfer</option></select></label>
  </div>
  <label className="kd-ops-payment-filter">Payment status <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)}><option value="all">All payment statuses</option>{['UNPAID','AWAITING_TRANSFER','PAID','REFUND_PENDING'].map(s=><option key={s}>{s}</option>)}</select></label>
  <p className="kd-ops-list-note">Lists load up to 100 recent orders per dashboard request. Dashboard totals cover all orders. {initialOrderId?'Viewing the selected order; choose Orders in the sidebar to return.':''}</p>
  <div className="kd-order-list">
   {visible.length?visible.map(order=><OrderCard key={order.id} order={order} admin loading={busy}
    allowedTransitions={ORDER_TRANSITIONS} onStatusChange={updateStatus} onVerifyPayment={verifyPayment}/>)
    :<div className="kd-admin-placeholder"><PackageSearch size={28}/> No orders match your filters.</div>}
  </div>
 </section>;
}
