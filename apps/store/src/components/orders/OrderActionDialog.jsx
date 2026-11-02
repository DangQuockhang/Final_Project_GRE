import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {money} from '@kd/catalog';
import '../../styles/order-actions.css';
const titles={payment:'Xác nhận đã nhận tiền',return:'Ghi nhận hoàn trả toàn bộ đơn',refund:'Xác nhận đã hoàn tiền',audit:'Lịch sử xử lý đơn'};
const actionNames={STATUS:'Cập nhật giao hàng',PAYMENT:'Xác nhận thanh toán',RETURN:'Nhận hàng hoàn',REFUND:'Xác nhận hoàn tiền'};
export default function OrderActionDialog({order,kind,api,perform,busy,onClose}){
 const panel=useRef(null),lock=useRef(false);
 const [reason,setReason]=useState(''),[reference,setReference]=useState(''),[restock,setRestock]=useState(false),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 const [audit,setAudit]=useState({loading:true,items:[],error:''}),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  panel.current?.querySelector('button')?.focus();
  return()=>{document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 useEffect(()=>{
  if(kind!=='audit')return;
  let live=true;setAudit({loading:true,items:[],error:''});
  api('/admin/orders/'+order.id+'/audit').then(data=>{if(live)setAudit({loading:false,items:data.items,error:''});})
   .catch(e=>{if(live)setAudit({loading:false,items:[],error:e.message});});
  return()=>{live=false;};
 },[api,order.id,kind,retry]);
 function keyboard(event){
  if(event.key==='Escape'&&!busy){event.preventDefault();onClose();}
  if(event.key!=='Tab')return;
  const targets=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]')];
  const first=targets[0],last=targets.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
 async function submit(event){
  event.preventDefault();if(busy||lock.current)return;setError('');
  if(reason.trim().length<10||reason.trim().length>500){setError('Nhập lý do từ 10 đến 500 ký tự.');return;}
  if(!confirmed){setError('Vui lòng xác nhận đã kiểm tra thao tác bên dưới.');return;}
  if(kind==='refund'&&reference.trim().length<3){setError('Nhập mã giao dịch hoặc mã biên nhận hoàn tiền.');return;}
  const body={reason:reason.trim(),confirmed};
  if(kind==='payment')body.status='PAID';
  if(kind==='return')body.restock=restock;
  if(kind==='refund')body.reference=reference.trim();
  lock.current=true;
  try{
   const done=await perform(async()=>{
    try{return await api('/admin/orders/'+order.id+'/'+kind,{method:kind==='payment'?'PATCH':'POST',body});}
    catch(e){setError(e.message||'Chưa lưu được thao tác. Vui lòng thử lại.');throw e;}
   },'Đã cập nhật đơn '+order.order_code+'.');
   if(done)onClose();
  }finally{lock.current=false;}
 }
 return createPortal(<div className="kd-order-dialog-backdrop"><section ref={panel} className="kd-order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-action-title" aria-describedby="order-action-description" onKeyDown={keyboard}>
  <header><div><span>{order.order_code}</span><h2 id="order-action-title">{titles[kind]}</h2></div><button type="button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><X size={22}/></button></header>
  <p id="order-action-description">{kind==='audit'?'Người thực hiện, thời điểm và thông tin từng lần xử lý được lưu tại đây.':
   kind==='return'?'Chỉ xác nhận khi đã nhận đủ hàng hoàn. Đơn sẽ không còn được tính vào chi tiêu thành viên.':
   kind==='refund'?'Chỉ ghi nhận sau khi đã hoàn tiền bên ngoài hệ thống. Nút này không chuyển tiền tự động.':
   'Kiểm tra đã nhận đủ '+money(order.total)+(order.payment_method==='COD'?' từ đơn vị giao hàng hoặc người mua.':' trong tài khoản ngân hàng của cửa hàng.')}</p>
  {kind==='audit'?<div className="kd-order-audit">
   {audit.loading?<div role="status" className="kd-order-audit-loading">Đang tải lịch sử xử lý…</div>:audit.error?<div><p role="alert">{audit.error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Thử tải lịch sử</button></div>:audit.items.length?<ol>{audit.items.map(item=><li key={item.id}><strong>{actionNames[item.action]||item.action}</strong><span>{item.actor_name} · {new Date(item.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</span><p>{item.reason}</p>{item.reference&&<p>Mã tham chiếu: {item.reference}</p>}{item.action==='RETURN'&&<small>{item.restocked?'Đã nhập lại kho':'Không nhập lại kho'}</small>}</li>)}</ol>:<p>Đơn chưa có thao tác được ghi nhận từ phiên bản này. Lịch sử cũ không được tự suy đoán.</p>}
  </div>:<form noValidate onSubmit={submit}>
   <label htmlFor="order-action-reason">Lý do / ghi chú kiểm tra<textarea id="order-action-reason" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} rows={3} disabled={busy} required aria-describedby={error?'order-action-error':undefined}/></label>
   {kind==='refund'&&<label htmlFor="order-action-reference">Mã giao dịch / biên nhận<input id="order-action-reference" value={reference} onChange={e=>setReference(e.target.value)} maxLength={120} disabled={busy} required/></label>}
   {kind==='return'&&<label className="kd-order-action-check"><input type="checkbox" checked={restock} onChange={e=>setRestock(e.target.checked)} disabled={busy}/>Hàng đã được kiểm tra, đủ điều kiện bán lại — nhập lại kho</label>}
   <label className="kd-order-action-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>{kind==='return'?'Tôi đã nhận đủ hàng hoàn của đơn này.':kind==='refund'?'Tôi đã hoàn đủ '+money(order.total)+' cho khách.':'Tôi đã kiểm tra và xác nhận nhận đủ tiền.'}</label>
   {error&&<p id="order-action-error" role="alert" className="kd-order-action-error">{error}</p>}
   <footer><button type="button" disabled={busy} onClick={onClose}>Để sau</button><button type="submit" disabled={busy} className="kd-order-action-confirm">{busy?'Đang lưu…':'Xác nhận và lưu'}</button></footer>
  </form>}
 </section></div>,document.body);
}
