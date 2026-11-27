import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight} from 'lucide-react';
import OrderCard from '../../components/orders/OrderCard.jsx';
import {Message} from '../../components/account/AccountFields.jsx';
const statuses=[['all','All orders'],['PENDING','Pending'],['CONFIRMED','Confirmed'],['SHIPPED','Shipped'],['DELIVERED','Delivered'],['CANCELLED','Cancelled'],['RETURNED','Returned']];
export default function CustomerOrders({token,request}){
 const [params,setParams]=useSearchParams(),page=params.get('page')||'1',status=params.get('status')||'all';
 const [result,setResult]=useState({key:'',loading:true,data:null,error:''}),[retry,setRetry]=useState(0);
 const [payments,setPayments]=useState(null),[paymentError,setPaymentError]=useState(false),[paymentRetry,setPaymentRetry]=useState(0);
 const key=page+'-'+status+'-'+retry;
 useEffect(()=>{
  let live=true;const controller=new AbortController();setResult({key,loading:true,data:null,error:''});
  request('/account/orders?'+new URLSearchParams({page,status}),{token,signal:controller.signal})
   .then(data=>{if(live)setResult({key,loading:false,data,error:''});})
   .catch(e=>{if(live&&e.name!=='AbortError')setResult({key,loading:false,data:null,error:e.message||'Unable to load your orders.'});});
  return()=>{live=false;controller.abort();};
 },[key,page,status,token,request]);
 useEffect(()=>{
  let live=true;const controller=new AbortController();setPaymentError(false);
  request('/payment-methods',{signal:controller.signal}).then(data=>{if(live)setPayments(data);}).catch(e=>{if(live&&e.name!=='AbortError')setPaymentError(true);});
  return()=>{live=false;controller.abort();};
 },[request,paymentRetry]);
 const update=values=>setParams(previous=>{
  const next=new URLSearchParams(previous);next.set('tab','orders');
  Object.entries(values).forEach(([name,value])=>next.set(name,String(value)));
  if(!Object.hasOwn(values,'page'))next.delete('page');return next;
 },{replace:true});
 const loading=result.key!==key||result.loading,data=result.key===key?result.data:null;
 return <section className="kd-customer-orders">
  <header className="kd-customer-orders-heading"><div><span className="kd-account-eyebrow">YOUR ORDERS</span><h2>Order history</h2><p>Review your purchases and track their delivery.</p></div><Link to="/shop">Continue shopping <ArrowRight size={17}/></Link></header>
  <label className="kd-customer-orders-filter">Order status<select aria-label="Filter order status" value={status} onChange={e=>update({status:e.target.value})}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  {loading?<div className="kd-account-skeleton" role="status" aria-label="Loading orders"><div/><div/><p>Loading orders…</p></div>:
   result.error?<div className="kd-account-card"><Message error>{result.error}</Message><button className="kd-account-primary" onClick={()=>setRetry(n=>n+1)}>Retry orders</button></div>:
   data&&<>
    {paymentError&&data.items.some(order=>order.payment_method==='BANK_TRANSFER'&&order.payment_status==='AWAITING_TRANSFER'&&!['CANCELLED','RETURNED'].includes(order.status))&&<div className="kd-account-message" role="status">Payment instructions are unavailable. Your orders are still shown.<button className="kd-account-secondary" onClick={()=>setPaymentRetry(n=>n+1)}>Retry instructions</button></div>}
    {!data.items.length?<div className="kd-account-card kd-customer-orders-empty"><h3>{status==='all'?'No orders yet':'No orders with this status'}</h3><p>{status==='all'?'Choose a piece you love. Your order will appear here after checkout.':'Choose another status to see your orders.'}</p>{status==='all'?<Link className="kd-account-primary" to="/shop">Explore products</Link>:<button className="kd-account-primary" onClick={()=>update({status:'all'})}>View all orders</button>}</div>:
     <div className="kd-order-list">{data.items.map(order=><OrderCard key={order.id} order={order} paymentConfig={payments}/>)}</div>}
    {data.pagination.total>0&&<nav className="kd-customer-orders-pagination" aria-label="Order pages"><p role="status">{data.pagination.total} orders · Page {data.pagination.page}/{Math.max(1,data.pagination.pages)}</p><div>
     <button className="kd-account-secondary" disabled={data.pagination.page<=1} onClick={()=>update({page:data.pagination.page-1})}><ChevronLeft size={16}/>Previous</button>
     <button className="kd-account-secondary" disabled={data.pagination.page>=data.pagination.pages} onClick={()=>update({page:data.pagination.page+1})}>Next<ChevronRight size={16}/></button>
    </div></nav>}
   </>}
 </section>;
}
