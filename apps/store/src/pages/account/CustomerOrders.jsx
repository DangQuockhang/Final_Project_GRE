import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight} from 'lucide-react';
import OrderCard from '../../components/orders/OrderCard.jsx';
import {Message} from '../../components/account/AccountFields.jsx';
const statuses=[['all','Tất cả đơn hàng'],['PENDING','Chờ xác nhận'],['CONFIRMED','Đã xác nhận'],['SHIPPED','Đang giao'],['DELIVERED','Đã giao'],['CANCELLED','Đã hủy']];
export default function CustomerOrders({token,request}){
 const [params,setParams]=useSearchParams(),page=params.get('page')||'1',status=params.get('status')||'all';
 const [result,setResult]=useState({key:'',loading:true,data:null,error:''}),[retry,setRetry]=useState(0);
 const [payments,setPayments]=useState(null),[paymentError,setPaymentError]=useState(false),[paymentRetry,setPaymentRetry]=useState(0);
 const key=page+'-'+status+'-'+retry;
 useEffect(()=>{
  let live=true;const controller=new AbortController();setResult({key,loading:true,data:null,error:''});
  request('/account/orders?'+new URLSearchParams({page,status}),{token,signal:controller.signal})
   .then(data=>{if(live)setResult({key,loading:false,data,error:''});})
   .catch(e=>{if(live&&e.name!=='AbortError')setResult({key,loading:false,data:null,error:e.message||'Không thể tải đơn hàng.'});});
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
  <header className="kd-customer-orders-heading"><div><span className="kd-account-eyebrow">NHỮNG ĐƠN HÀNG CỦA BẠN</span><h2>Lịch sử mua hàng</h2><p>Xem món đồ đã chọn và theo dõi tiến trình giao hàng.</p></div><Link to="/shop">Tiếp tục mua sắm <ArrowRight size={17}/></Link></header>
  <label className="kd-customer-orders-filter">Trạng thái đơn hàng<select aria-label="Lọc trạng thái đơn hàng" value={status} onChange={e=>update({status:e.target.value})}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  {loading?<div className="kd-account-skeleton" role="status" aria-label="Đang tải đơn hàng"><div/><div/><p>Đang tải đơn hàng…</p></div>:
   result.error?<div className="kd-account-card"><Message error>{result.error}</Message><button className="kd-account-primary" onClick={()=>setRetry(n=>n+1)}>Thử tải đơn hàng</button></div>:
   data&&<>
    {paymentError&&data.items.some(order=>order.payment_method==='BANK_TRANSFER'&&order.payment_status==='AWAITING_TRANSFER')&&<div className="kd-account-message" role="status">Chưa tải được hướng dẫn chuyển khoản. Đơn hàng của bạn vẫn được hiển thị.<button className="kd-account-secondary" onClick={()=>setPaymentRetry(n=>n+1)}>Thử tải hướng dẫn</button></div>}
    {!data.items.length?<div className="kd-account-card kd-customer-orders-empty"><h3>{status==='all'?'Bạn chưa có đơn hàng nào':'Chưa có đơn ở trạng thái này'}</h3><p>{status==='all'?'Chọn một món đồ bạn thích; đơn hàng sẽ xuất hiện ở đây sau khi đặt.':'Chọn trạng thái khác để xem các đơn đã đặt.'}</p>{status==='all'?<Link className="kd-account-primary" to="/shop">Khám phá sản phẩm</Link>:<button className="kd-account-primary" onClick={()=>update({status:'all'})}>Xem tất cả đơn hàng</button>}</div>:
     <div className="kd-order-list">{data.items.map(order=><OrderCard key={order.id} order={order} paymentConfig={payments}/>)}</div>}
    {data.pagination.total>0&&<nav className="kd-customer-orders-pagination" aria-label="Phân trang đơn hàng"><p role="status">{data.pagination.total} đơn hàng · Trang {data.pagination.page}/{Math.max(1,data.pagination.pages)}</p><div>
     <button className="kd-account-secondary" disabled={data.pagination.page<=1} onClick={()=>update({page:data.pagination.page-1})}><ChevronLeft size={16}/>Trang trước</button>
     <button className="kd-account-secondary" disabled={data.pagination.page>=data.pagination.pages} onClick={()=>update({page:data.pagination.page+1})}>Trang sau<ChevronRight size={16}/></button>
    </div></nav>}
   </>}
 </section>;
}
