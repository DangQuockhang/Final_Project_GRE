import {useCallback,useEffect,useRef,useState} from 'react';
export default function useCheckoutAddress({user,token,request}){
 const [form,setForm]=useState(()=>({recipient:user.name||'',phone:user.phone||'',address:''}));
 const [saved,setSaved]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const dirty=useRef(new Set());
 const change=useCallback((key,value)=>{dirty.current.add(key);setForm(old=>({...old,[key]:value}));},[]);
 useEffect(()=>{
  let live=true;const controller=new AbortController();setLoading(true);setError('');
  request('/auth/address',{token,signal:controller.signal}).then(data=>{
   if(!live)return;setSaved(data.address);
   const fallback={recipient:user.name||'',phone:user.phone||'',address:''},values=data.address||fallback;
   // A slow response must never replace delivery information already typed by the shopper.
   setForm(old=>Object.fromEntries(['recipient','phone','address'].map(key=>[key,dirty.current.has(key)?old[key]:values[key]||''])));
  }).catch(e=>{if(live&&e.name!=='AbortError')setError('Unable to load your saved address. Enter it manually below or try again.');})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;controller.abort();};
 },[token,request,retry,user.name,user.phone]);
 const applySaved=()=>{if(!saved)return;dirty.current=new Set(['recipient','phone','address']);setForm({recipient:saved.recipient,phone:saved.phone,address:saved.address});};
 return {form,change,saved,loading,error,retry:()=>setRetry(n=>n+1),applySaved};
}
