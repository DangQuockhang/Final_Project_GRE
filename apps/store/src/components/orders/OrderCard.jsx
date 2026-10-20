import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {CheckCircle2,Clock3,MapPin,Truck,PackageCheck,ReceiptText,ImageOff,Wallet,AlertTriangle} from 'lucide-react';
import {apiBase,money,productImageUrl} from '@kd/catalog';
const publicOrderCode=order=>order?.order_code||'KD-'+String(order?.id||'').padStart(8,'0');

const titles={PENDING:'New order',CONFIRMED:'Confirmed',SHIPPED:'On the way',DELIVERED:'Delivered',CANCELLED:'Cancelled'};
const payText={COD:'Cash on delivery',BANK_TRANSFER:'Bank transfer'};
const payState={UNPAID:'Not yet paid',AWAITING_TRANSFER:'Awaiting transfer',PAID:'Payment verified',REFUND_PENDING:'Refund needs action'};
const dateText=value=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
function Photo({item}){
 const url=productImageUrl(item.image_url,import.meta.env.VITE_API_URL||apiBase);
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[url]);
 return <div className="kd-order-history-photo">{url&&!broken?
  <img src={url} alt={item.product_name||'Ordered product'} onError={()=>setBroken(true)}/>:
  <ImageOff size={26} aria-label="Product image unavailable"/>}</div>;
}
export default function OrderCard({order,admin=false,loading=false,onStatusChange,onVerifyPayment,paymentConfig,allowedTransitions={}}){
 const reference=publicOrderCode(order);
 const status=order.status||'PENDING',payment=order.payment_status||'UNPAID';
 const items=order.items||[];
 return <article className="kd-order-card">
  <div className="kd-order-card-header">
   <div><span className="kd-order-card-overline">ORDER REFERENCE</span><h3>{reference}</h3>
    <p>{dateText(order.created_at)}{admin?' · '+order.recipient:''}</p>
   </div>
   <span className={'kd-order-status kd-order-status-'+status.toLowerCase()}>{titles[status]||status}</span>
  </div>
  <div className="kd-order-purchase-grid">
   <div className="kd-order-purchased-items">
    {items.map((item,i)=><div className="kd-order-purchased-item" key={i}>
     <Photo item={item}/>
     <div className="kd-order-item-main">
      <small>{item.brand_name||'KD DESIGN'}</small>
      {item.slug?<Link to={'/product/'+item.slug}>{item.product_name}</Link>:<strong>{item.product_name}</strong>}
      <span>Size: {item.size}{item.color&&item.color!=='Standard'?' · '+item.color:''} · Qty {item.quantity}</span>
      <b>{money(item.unit_price*item.quantity)}</b>
     </div>
    </div>)}
   </div>
   <div className="kd-order-facts">
    <div><Truck size={18}/><div><small>FULFILLMENT</small><b>{titles[status]||status}</b></div></div>
    <div><Wallet size={18}/><div><small>PAYMENT</small><b>{payText[order.payment_method]||'Cash on delivery'}</b><span>{payState[payment]||payment}</span></div></div>
    <div><MapPin size={18}/><div><small>DELIVERY ADDRESS</small><span>{order.address}</span><span>{order.recipient} · {order.phone}</span></div></div>
    {admin&&order.email&&<div><ReceiptText size={18}/><div><small>CUSTOMER EMAIL</small><span>{order.email}</span></div></div>}
   </div>
  </div>
  {order.payment_method==='BANK_TRANSFER'&&payment==='AWAITING_TRANSFER'&&paymentConfig?.bank_transfer?.enabled&&!admin&&
   <div className="kd-bank-instructions"><strong>Bank transfer instructions</strong><span>{paymentConfig.bank_transfer.bank} · {paymentConfig.bank_transfer.name}</span>
    <span>Account: {paymentConfig.bank_transfer.account}</span><span>Reference: {reference}</span>
    <small>Place the transfer yourself and wait for the store to verify receipt. The order is not paid yet.</small>
   </div>}
  {payment==='REFUND_PENDING'&&<div className="kd-refund-warning"><AlertTriangle size={18}/> Payment refund requires manual processing. This is not an automatic refund.</div>}
  <div className="kd-order-card-footer">
   <div><span>{items.reduce((n,x)=>n+Number(x.quantity),0)} item(s)</span><strong>{money(order.total)}</strong></div>
   {admin&&<div className="kd-order-admin-controls">
    {order.payment_method==='BANK_TRANSFER'&&payment==='AWAITING_TRANSFER'&&
     <button type="button" className="border-button" disabled={loading} onClick={()=>onVerifyPayment?.(order)}><CheckCircle2 size={17}/> VERIFY TRANSFER RECEIPT</button>}
    {allowedTransitions[status]?.length>0&&<select aria-label={'Change order '+reference+' status'} disabled={loading} value=""
     onChange={e=>e.target.value&&onStatusChange(order,e.target.value)}>
     <option value="">Update order status…</option>{allowedTransitions[status].map(s=><option key={s} value={s}>{titles[s]||s}</option>)}
    </select>}
   </div>}
  </div>
 </article>;
}
