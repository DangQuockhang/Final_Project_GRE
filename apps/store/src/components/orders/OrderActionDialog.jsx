import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {money} from '@kd/catalog';
import '../../styles/order-actions.css';
const titles={payment:'Confirm payment received',return:'Record full order return',refund:'Confirm refund',audit:'Order activity'};
const actionNames={STATUS:'Fulfilment updated',PAYMENT:'Payment confirmed',RETURN:'Return received',REFUND:'Refund confirmed'};
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
  if(reason.trim().length<10||reason.trim().length>500){setError('Enter a reason containing 10–500 characters.');return;}
  if(!confirmed){setError('Confirm that you have checked the action below.');return;}
  if(kind==='refund'&&reference.trim().length<3){setError('Enter a transaction or refund receipt reference.');return;}
  const body={reason:reason.trim(),confirmed};
  if(kind==='payment')body.status='PAID';
  if(kind==='return')body.restock=restock;
  if(kind==='refund')body.reference=reference.trim();
  lock.current=true;
  try{
   const done=await perform(async()=>{
    try{return await api('/admin/orders/'+order.id+'/'+kind,{method:kind==='payment'?'PATCH':'POST',body});}
    catch(e){setError(e.message||'Unable to save this action. Try again.');throw e;}
   },'Updated order '+order.order_code+'.');
   if(done)onClose();
  }finally{lock.current=false;}
 }
 return createPortal(<div className="kd-order-dialog-backdrop"><section ref={panel} className="kd-order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-action-title" aria-describedby="order-action-description" onKeyDown={keyboard}>
  <header><div><span>{order.order_code}</span><h2 id="order-action-title">{titles[kind]}</h2></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={22}/></button></header>
  <p id="order-action-description">{kind==='audit'?'Review who handled each action, when it happened and the recorded details.':
   kind==='return'?'Confirm only after receiving the full return. This order will no longer count towards membership spending.':
   kind==='refund'?'Record this only after refunding the customer outside this system. This action does not transfer money.':
   'Check that you have received '+money(order.total)+(order.payment_method==='COD'?' from the courier or customer.':' in the store bank account.')}</p>
  {kind==='audit'?<div className="kd-order-audit">
   {audit.loading?<div role="status" className="kd-order-audit-loading">Loading order activity…</div>:audit.error?<div><p role="alert">{audit.error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Retry activity</button></div>:audit.items.length?<ol>{audit.items.map(item=><li key={item.id}><strong>{actionNames[item.action]||item.action}</strong><span>{item.actor_name} · {new Date(item.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</span><p>{item.reason}</p>{item.reference&&<p>Reference: {item.reference}</p>}{item.action==='RETURN'&&<small>{item.restocked?'Restocked':'Not restocked'}</small>}</li>)}</ol>:<p>No actions have been recorded for this order since this feature was introduced.</p>}
  </div>:<form noValidate onSubmit={submit}>
   <label htmlFor="order-action-reason">Reason / verification notes<textarea id="order-action-reason" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} rows={3} disabled={busy} required aria-describedby={error?'order-action-error':undefined}/></label>
   {kind==='refund'&&<label htmlFor="order-action-reference">Transaction / receipt reference<input id="order-action-reference" value={reference} onChange={e=>setReference(e.target.value)} maxLength={120} disabled={busy} required/></label>}
   {kind==='return'&&<label className="kd-order-action-check"><input type="checkbox" checked={restock} onChange={e=>setRestock(e.target.checked)} disabled={busy}/>Items have been inspected and can be resold — restock</label>}
   <label className="kd-order-action-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>{kind==='return'?'I have received all returned items.':kind==='refund'?'I have refunded '+money(order.total)+' to the customer.':'I have checked and received the full payment.'}</label>
   {error&&<p id="order-action-error" role="alert" className="kd-order-action-error">{error}</p>}
   <footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className="kd-order-action-confirm">{busy?'Saving…':'Confirm and save'}</button></footer>
  </form>}
 </section></div>,document.body);
}
