import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {CheckCircle2,Clock3,MapPin,Truck,PackageCheck,ReceiptText,ImageOff,Wallet,AlertTriangle} from 'lucide-react';
import {apiBase,money,productImageUrl} from '@kd/catalog';
const publicOrderCode=order=>order?.order_code||'KD-'+String(order?.id||'').padStart(8,'0');

const titles={PENDING:'New order',CONFIRMED:'Confirmed',SHIPPED:'On the way',DELIVERED:'Delivered',CANCELLED:'Cancelled'};
const payText={COD:'Cash on delivery',BANK_TRANSFER:'Bank transfer'};
const payState={UNPAID:'Not yet paid',AWAITING_TRANSFER:'Awaiting transfer',PAID:'Payment verified',REFUND_PENDING:'Refund needs action'};
const dateText=(value,locale='en-GB')=>new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
function Photo({item}){
 const url=productImageUrl(item.image_url,import.meta.env.VITE_API_URL||apiBase);
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[url]);
 return <div className="kd-order-history-photo">{url&&!broken?
  <img loading="lazy" decoding="async" src={url} alt={item.product_name||'Ordered product'} onError={()=>setBroken(true)}/>:
  <ImageOff size={26} aria-label="Product image unavailable"/>}</div>;
}
export default function OrderCard({order,admin=false,loading=false,onStatusChange,onVerifyPayment,paymentConfig,allowedTransitions={}}){
 const reference=publicOrderCode(order);
 const labels=admin?titles:{PENDING:'Chờ xác nhận',CONFIRMED:'Đã xác nhận',SHIPPED:'Đang giao',DELIVERED:'Đã giao',CANCELLED:'Đã hủy'};
 const methods=admin?payText:{COD:'Thanh toán khi nhận hàng',BANK_TRANSFER:'Chuyển khoản ngân hàng'};
 const payments=admin?payState:{UNPAID:'Chưa thanh toán',AWAITING_TRANSFER:'Chờ chuyển khoản',PAID:'Đã xác nhận thanh toán',REFUND_PENDING:'Đang chờ hoàn tiền'};
 const t=(english,vietnamese)=>admin?english:vietnamese;
 const status=order.status||'PENDING',payment=order.payment_status||'UNPAID';
 const items=order.items||[];
 return <article className="kd-order-card">
  <div className="kd-order-card-header">
   <div><span className="kd-order-card-overline">{t('ORDER REFERENCE','MÃ ĐƠN HÀNG')}</span><h3>{reference}</h3>
    <p>{dateText(order.created_at,admin?'en-GB':'vi-VN')}{admin?' · '+order.recipient:''}</p>
   </div>
   <span className={'kd-order-status kd-order-status-'+status.toLowerCase()}>{labels[status]||status}</span>
  </div>
  <div className="kd-order-purchase-grid">
   <div className="kd-order-purchased-items">
    {items.map((item,i)=><div className="kd-order-purchased-item" key={i}>
     <Photo item={item}/>
     <div className="kd-order-item-main">
      <small>{item.brand_name||'KD DESIGN'}</small>
      {item.slug?<Link to={'/product/'+item.slug}>{item.product_name}</Link>:<strong>{item.product_name}</strong>}
      <span>{t('Size','Cỡ')}: {item.size}{item.color&&item.color!=='Standard'?' · '+item.color:''} · {t('Qty','SL')} {item.quantity}</span>
      <b>{money(item.unit_price*item.quantity)}</b>
     </div>
    </div>)}
   </div>
   <div className="kd-order-facts">
    <div><Truck size={18}/><div><small>{t('FULFILLMENT','GIAO HÀNG')}</small><b>{labels[status]||status}</b></div></div>
    <div><Wallet size={18}/><div><small>{t('PAYMENT','THANH TOÁN')}</small><b>{methods[order.payment_method]||methods.COD}</b><span>{payments[payment]||payment}</span></div></div>
    <div><MapPin size={18}/><div><small>{t('DELIVERY ADDRESS','ĐỊA CHỈ NHẬN HÀNG')}</small><span>{order.address}</span><span>{order.recipient} · {order.phone}</span></div></div>
    {admin&&order.email&&<div><ReceiptText size={18}/><div><small>CUSTOMER EMAIL</small><span>{order.email}</span></div></div>}
   </div>
  </div>
  {order.payment_method==='BANK_TRANSFER'&&payment==='AWAITING_TRANSFER'&&paymentConfig?.bank_transfer?.enabled&&!admin&&
   <div className="kd-bank-instructions"><strong>Hướng dẫn chuyển khoản</strong><span>{paymentConfig.bank_transfer.bank} · {paymentConfig.bank_transfer.name}</span>
    <span>Số tài khoản: {paymentConfig.bank_transfer.account}</span><span>Nội dung: {reference}</span>
    <small>Vui lòng chuyển khoản đúng nội dung và chờ cửa hàng xác nhận đã nhận tiền.</small>
   </div>}
  {payment==='REFUND_PENDING'&&<div className="kd-refund-warning"><AlertTriangle size={18}/> {t('Payment refund requires manual processing. This is not an automatic refund.','Cửa hàng đang xử lý hoàn tiền. Khoản tiền chưa được hoàn tự động.')}</div>}
  <div className="kd-order-card-footer">
   <div><span>{items.reduce((n,x)=>n+Number(x.quantity),0)} {t('item(s)','sản phẩm')}</span><strong>{money(order.total)}</strong></div>
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
