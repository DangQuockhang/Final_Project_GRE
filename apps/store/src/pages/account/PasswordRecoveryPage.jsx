import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Field,Message} from '../../components/account/AccountFields.jsx';
import {validateEmail,validatePassword} from '../../utils/accountValidation.js';
import '../../styles/customer-account.css';
export default function PasswordRecoveryPage({request,reset=false,onReset}){
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const [form,setForm]=useState({email:'',password:'',confirm:''}),[errors,setErrors]=useState({}),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 useEffect(()=>{
  if(!reset)return;
  // Keep the secret out of browser history, referrers and server URL logs.
  window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);
  const meta=document.createElement('meta');meta.name='referrer';meta.content='no-referrer';document.head.append(meta);
  return()=>meta.remove();
 },[reset]);
 const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:''}));};
 async function submit(e){
  e.preventDefault();if(busy)return;
  const next=reset?{password:validatePassword(form.password),confirm:form.password!==form.confirm?'Passwords do not match.':''}:{email:validateEmail(form.email)};
  setErrors(next);setError('');setMessage('');if(Object.values(next).some(Boolean))return;
  if(reset&&!window.confirm('Reset your password and end existing sessions?'))return;
  setBusy(true);
  try{
   const data=await request(reset?'/auth/reset-password':'/auth/forgot-password',{method:'POST',body:reset?{token,new_password:form.password,confirm_password:form.confirm}:{email:form.email}});
   setMessage(data.message);setDone(reset);if(reset){setForm({email:'',password:'',confirm:''});onReset?.();}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const validToken=/^[a-f0-9]{64}$/.test(token);
 return <section className="kd-account-recovery"><form noValidate onSubmit={submit} className="kd-account-card">
  <span className="kd-account-eyebrow">KD / ACCOUNT SECURITY</span><h1>{reset?'Reset password':'Forgot password?'}</h1>
  <p className="kd-account-help">{reset?'Create a new password to continue shopping with KD.':'Enter your account email. Reset links expire after 30 minutes.'}</p>
  {reset&&!validToken?<Message error>This link is invalid or missing a token. Request a new link.</Message>:!done&&<>
   {reset?<><Field id="reset-password" label="New password" type="password" autoComplete="new-password" value={form.password} onChange={e=>set('password',e.target.value)} error={errors.password} disabled={busy}/><Field id="reset-confirm" label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} error={errors.confirm} disabled={busy}/></>:<Field id="forgot-email" label="Account email" type="email" autoComplete="email" value={form.email} onChange={e=>set('email',e.target.value)} error={errors.email} disabled={busy}/>}
   <button className="kd-account-primary" disabled={busy} type="submit">{busy?'Processing…':reset?'Reset password':'Send instructions'}</button>
  </>}
  <Message error>{error}</Message><Message>{message}</Message>
  {reset&&!done&&<Link className="kd-account-text-link" to="/forgot-password">Request a new link</Link>}
  <Link className="kd-account-text-link" to="/login">Back to sign in</Link>
 </form></section>;
}
