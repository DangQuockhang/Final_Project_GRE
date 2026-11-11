import React,{useEffect,useRef,useState} from 'react';
import {MapPin,Check,Trash2} from 'lucide-react';
import {validateDelivery} from '@kd/catalog';
import DeliveryFields from '../../components/account/DeliveryFields.jsx';
import {Message,SuccessToast} from '../../components/account/AccountFields.jsx';
export default function DefaultAddress({user,token,request}){
 const initial={recipient:user.name||'',phone:user.phone||'',address:''};
 const [form,setForm]=useState(initial),[saved,setSaved]=useState(null),[loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState(''),[error,setError]=useState(''),[errors,setErrors]=useState({}),[message,setMessage]=useState('');
 const [retry,setRetry]=useState(0),[busy,setBusy]=useState(false),lock=useRef(false);
 useEffect(()=>{
  let live=true;const controller=new AbortController();setLoading(true);setLoadError('');
  request('/auth/address',{token,signal:controller.signal}).then(data=>{if(live){setSaved(data.address);setForm(data.address||{recipient:user.name||'',phone:user.phone||'',address:''});}})
   .catch(e=>{if(live&&e.name!=='AbortError')setLoadError(e.message||'Unable to load your address.');}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;controller.abort();};
 },[token,request,retry,user.name,user.phone]);
 const change=(key,value)=>{setForm(old=>({...old,[key]:value}));setErrors(old=>({...old,[key]:''}));setError('');setMessage('');};
 async function save(event){
  event.preventDefault();if(lock.current)return;
  const checked=validateDelivery(form);setErrors(checked.errors);setError('');setMessage('');if(!checked.valid)return;
  lock.current=true;setBusy(true);
  try{const data=await request('/auth/address',{method:'PUT',token,body:checked.values});setSaved(data.address);setForm(data.address);setMessage(data.message);}
  catch(e){setError(e.message);setErrors(e.errors||{});}finally{lock.current=false;setBusy(false);}
 }
 async function remove(){
  if(lock.current||!window.confirm('Remove the default address? Existing order addresses will stay unchanged.'))return;
  lock.current=true;setBusy(true);setError('');setMessage('');
  try{const data=await request('/auth/address',{method:'DELETE',token});setSaved(null);setForm(initial);setErrors({});setMessage(data.message);}
  catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 }
 if(loading)return <div className="kd-account-skeleton" role="status" aria-label="Loading address"><div/><div/><p>Loading your address…</p></div>;
 if(loadError)return <div className="kd-account-card"><Message error>{loadError}</Message><button className="kd-account-primary" onClick={()=>setRetry(n=>n+1)}>Try again</button></div>;
 return <form className="kd-account-card" noValidate onSubmit={save}>
  <header><span className="kd-account-eyebrow">EASIER DELIVERY</span><h2>Default address</h2>
   <p>{saved?'This address will be filled in at your next checkout.':'No saved address yet. Add one below for faster checkout.'}</p></header>
  <p className="kd-address-note"><MapPin size={18} aria-hidden="true"/>You can use a different address for each order.</p>
  <DeliveryFields prefix="account-address" value={form} onChange={change} errors={errors} disabled={busy}/>
  <Message error>{error}</Message><SuccessToast message={message}/>
  <div className="kd-account-save"><button className="kd-account-primary" disabled={busy}><Check size={17}/>{busy?'Saving…':'Save address'}</button>
   {saved&&<button className="kd-account-secondary" type="button" disabled={busy} onClick={remove}><Trash2 size={17}/>Remove address</button>}</div>
 </form>;
}
