import React,{useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {Field,Message} from '../../components/account/AccountFields.jsx';
import {validateName,validateEmail,validatePassword} from '../../utils/accountValidation.js';
import '../../styles/customer-account.css';
export default function AuthPage({request,onLogin}){
 const nav=useNavigate(),[params]=useSearchParams();
 const register=params.get('mode')==='register';
 const [form,setForm]=useState({name:'',email:'',password:''}),[errors,setErrors]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 React.useEffect(()=>{setErrors({});setError('');setForm({name:'',email:'',password:''});},[register]);
 const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:''}));};
 async function submit(e){
  e.preventDefault();if(busy)return;
  const next={name:register?validateName(form.name):'',email:validateEmail(form.email),password:register?validatePassword(form.password):!form.password?'Enter your password.':''};
  setErrors(next);setError('');if(Object.values(next).some(Boolean))return;
  setBusy(true);
  try{const data=await request(register?'/auth/register':'/auth/login',{method:'POST',body:form});onLogin(data);nav(data.user.role==='admin'?'/admin':'/account');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="kd-account-auth">
  <div className="kd-account-auth-intro"><span>KD / YOUR EVERYDAY STYLE</span><h1>{register?'Your style starts here.':'Welcome back.'}</h1><p>One account for your details, orders and favourite pieces.</p></div>
  <form key={register?'register':'login'} noValidate onSubmit={submit} className="kd-account-card">
   <span className="kd-account-eyebrow">YOUR KD ACCOUNT</span><h2>{register?'Create account':'Sign in'}</h2>
   {params.has('passwordChanged')&&<Message>Password updated. Please sign in again.</Message>}
   {params.has('sessionExpired')&&<Message error>Your session has ended. Please sign in again.</Message>}
   {register&&<Field id="register-name" label="Full name" autoComplete="name" value={form.name} maxLength={100} onChange={e=>set('name',e.target.value)} error={errors.name} disabled={busy}/>}
   <Field id="login-email" label="Email" type="email" autoComplete="email" value={form.email} maxLength={255} onChange={e=>set('email',e.target.value)} error={errors.email} disabled={busy}/>
   <Field id="login-password" label="Password" type="password" autoComplete={register?'new-password':'current-password'} value={form.password} onChange={e=>set('password',e.target.value)} error={errors.password} disabled={busy} hint={register?'Use at least 8 characters. Keep your password private.':undefined}/>
   {!register&&<Link className="kd-account-text-link" to="/forgot-password">Forgot password?</Link>}
   <Message error>{error}</Message>
   <button type="submit" className="kd-account-primary" disabled={busy} aria-label={register?'Create account':'Sign in'}>{busy?'Processing…':register?'Create account':'Sign in'}<ArrowRight size={17}/></button>
   <button type="button" className="kd-account-switch" disabled={busy} onClick={()=>{nav(register?'/login':'/login?mode=register');setErrors({});setError('');setForm({name:'',email:'',password:''});}}>{register?'Already have an account? Sign in':'New to KD? Create an account'}</button>
   {register&&<p className="kd-account-help">You can add your phone number and photo in your profile later.</p>}
  </form>
 </section>;
}
