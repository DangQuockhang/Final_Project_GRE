import React,{useEffect,useRef,useState} from 'react';
import {AlertTriangle,LockKeyhole,Trash2,X} from 'lucide-react';

export default function PermanentDeleteDialog({product,check,checking,busy,onConfirm,onClose}){
 const [typed,setTyped]=useState('');
 const input=useRef(null);
 useEffect(()=>{setTyped('');},[product?.id]);
 useEffect(()=>{
  if(check?.eligible)input.current?.focus();
  const handler=e=>{if(e.key==='Escape'&&!busy)onClose();};
  window.addEventListener('keydown',handler);
  return ()=>window.removeEventListener('keydown',handler);
 },[check?.eligible,busy,onClose]);
 if(!product)return null;
 return <div className="kd-delete-backdrop" role="presentation">
  <div className="kd-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="kd-delete-title" aria-describedby="kd-delete-description">
   <div className="kd-delete-heading"><AlertTriangle size={23}/><h2 id="kd-delete-title">Delete product permanently?</h2>
    <button type="button" onClick={onClose} disabled={busy} aria-label="Close delete dialog"><X size={19}/></button>
   </div>
   <p id="kd-delete-description">Permanently remove <strong>{product.name}</strong> (#{product.id}) and its unused size/color SKUs. This action cannot be undone.</p>
   {checking?<p className="kd-delete-loading" role="status">Checking stock and order history…</p>:
    check&&!check.eligible?<div className="kd-delete-blocked" role="alert"><LockKeyhole size={18}/><span><strong>Deletion blocked</strong>{check.reason} Use Archive or adjust inventory instead.</span></div>:
    check?.eligible?<form onSubmit={e=>{e.preventDefault();if(typed==='DELETE'&&!busy)onConfirm();}}>
      <div className="kd-delete-counts"><span>Stock: <strong>{check.stock}</strong></span><span>Order references: <strong>{check.orderItems}</strong></span></div>
      <label htmlFor="kd-delete-confirm">Enter <strong>DELETE</strong> to confirm:</label>
      <input id="kd-delete-confirm" ref={input} autoComplete="off" spellCheck={false} value={typed} onChange={e=>setTyped(e.target.value)} placeholder="DELETE" />
      <div className="kd-delete-footer">
        <button type="button" className="border-button" onClick={onClose} disabled={busy}>CANCEL</button>
        <button type="submit" className="kd-permanent-confirm" disabled={busy||typed!=='DELETE'}><Trash2 size={15}/>{busy?'DELETING…':'DELETE PERMANENTLY'}</button>
      </div>
     </form>:<p role="status">Loading product eligibility…</p>}
   {!check?.eligible&&<div className="kd-delete-footer"><button type="button" className="border-button" onClick={onClose} disabled={busy}>CLOSE</button></div>}
  </div>
 </div>;
}
