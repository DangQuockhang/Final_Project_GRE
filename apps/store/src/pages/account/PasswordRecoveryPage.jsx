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
  const next=reset?{password:validatePassword(form.password),confirm:form.password!==form.confirm?'Mật khẩu xác nhận chưa khớp.':''}:{email:validateEmail(form.email)};
  setErrors(next);setError('');setMessage('');if(Object.values(next).some(Boolean))return;
  if(reset&&!window.confirm('Bạn muốn đặt lại mật khẩu? Các phiên đăng nhập cũ sẽ kết thúc.'))return;
  setBusy(true);
  try{
   const data=await request(reset?'/auth/reset-password':'/auth/forgot-password',{method:'POST',body:reset?{token,new_password:form.password,confirm_password:form.confirm}:{email:form.email}});
   setMessage(data.message);setDone(reset);if(reset){setForm({email:'',password:'',confirm:''});onReset?.();}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const validToken=/^[a-f0-9]{64}$/.test(token);
 return <section className="kd-account-recovery"><form noValidate onSubmit={submit} className="kd-account-card">
  <span className="kd-account-eyebrow">KD / BẢO MẬT TÀI KHOẢN</span><h1>{reset?'Đặt lại mật khẩu':'Quên mật khẩu?'}</h1>
  <p className="kd-account-help">{reset?'Tạo mật khẩu mới để tiếp tục mua sắm cùng KD.':'Nhập email đã đăng ký. Liên kết đặt lại mật khẩu có hiệu lực 30 phút.'}</p>
  {reset&&!validToken?<Message error>Liên kết không hợp lệ hoặc thiếu mã xác nhận. Hãy yêu cầu một liên kết mới.</Message>:!done&&<>
   {reset?<><Field id="reset-password" label="Mật khẩu mới" type="password" autoComplete="new-password" value={form.password} onChange={e=>set('password',e.target.value)} error={errors.password} disabled={busy}/><Field id="reset-confirm" label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} error={errors.confirm} disabled={busy}/></>:<Field id="forgot-email" label="Email đã đăng ký" type="email" autoComplete="email" value={form.email} onChange={e=>set('email',e.target.value)} error={errors.email} disabled={busy}/>}
   <button className="kd-account-primary" disabled={busy} type="submit">{busy?'Đang xử lý…':reset?'Đặt lại mật khẩu':'Gửi hướng dẫn'}</button>
  </>}
  <Message error>{error}</Message><Message>{message}</Message>
  {reset&&!done&&<Link className="kd-account-text-link" to="/forgot-password">Yêu cầu liên kết mới</Link>}
  <Link className="kd-account-text-link" to="/login">Quay lại đăng nhập</Link>
 </form></section>;
}
