import React,{useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {Field,Message} from '../../components/account/AccountFields.jsx';
import {validateName,validateEmail,validatePassword} from '../../utils/accountValidation.js';
import '../../styles/customer-account.css';
export default function AuthPage({request,onLogin}){
 const nav=useNavigate(),[params]=useSearchParams();
 const [register,setRegister]=useState(false),[form,setForm]=useState({name:'',email:'',password:''}),[errors,setErrors]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:''}));};
 async function submit(e){
  e.preventDefault();if(busy)return;
  const next={name:register?validateName(form.name):'',email:validateEmail(form.email),password:register?validatePassword(form.password):!form.password?'Vui lòng nhập mật khẩu.':''};
  setErrors(next);setError('');if(Object.values(next).some(Boolean))return;
  setBusy(true);
  try{const data=await request(register?'/auth/register':'/auth/login',{method:'POST',body:form});onLogin(data);nav(data.user.role==='admin'?'/admin':'/account');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="kd-account-auth">
  <div className="kd-account-auth-intro"><span>KD / YOUR EVERYDAY STYLE</span><h1>{register?'Bắt đầu với KD.':'Chào mừng trở lại.'}</h1><p>Một tài khoản để lưu thông tin cá nhân và theo dõi những món đồ bạn yêu thích.</p></div>
  <form noValidate onSubmit={submit} className="kd-account-card">
   <span className="kd-account-eyebrow">TÀI KHOẢN KHÁCH HÀNG</span><h2>{register?'Tạo tài khoản':'Đăng nhập'}</h2>
   {params.has('passwordChanged')&&<Message>Đã cập nhật mật khẩu. Vui lòng đăng nhập lại.</Message>}
   {params.has('sessionExpired')&&<Message error>Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.</Message>}
   {register&&<Field id="register-name" label="Họ và tên" autoComplete="name" value={form.name} maxLength={100} onChange={e=>set('name',e.target.value)} error={errors.name} disabled={busy}/>}
   <Field id="login-email" label="Email" type="email" autoComplete="email" value={form.email} maxLength={255} onChange={e=>set('email',e.target.value)} error={errors.email} disabled={busy}/>
   <Field id="login-password" label="Mật khẩu" type="password" autoComplete={register?'new-password':'current-password'} value={form.password} onChange={e=>set('password',e.target.value)} error={errors.password} disabled={busy} hint={register?'Ít nhất 8 ký tự. Không chia sẻ mật khẩu với người khác.':undefined}/>
   {!register&&<Link className="kd-account-text-link" to="/forgot-password">Quên mật khẩu?</Link>}
   <Message error>{error}</Message>
   <button type="submit" className="kd-account-primary" disabled={busy} aria-label={register?'Tạo tài khoản':'Đăng nhập / Sign in'}>{busy?'Đang xử lý…':register?'Tạo tài khoản':'Đăng nhập'}<ArrowRight size={17}/></button>
   <button type="button" className="kd-account-switch" disabled={busy} onClick={()=>{setRegister(v=>!v);setErrors({});setError('');setForm({name:'',email:'',password:''});}}>{register?'Đã có tài khoản? Đăng nhập':'Chưa có tài khoản? Đăng ký'}</button>
   {register&&<p className="kd-account-help">Số điện thoại và ảnh đại diện có thể bổ sung sau trong hồ sơ.</p>}
  </form>
 </section>;
}
