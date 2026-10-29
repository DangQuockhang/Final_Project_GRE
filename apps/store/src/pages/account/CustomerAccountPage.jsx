import React,{useEffect,useRef,useState} from 'react';
import {AVATAR_MAX_BYTES,AVATAR_MAX_MB} from '@kd/catalog';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {UserRound,LockKeyhole,ShoppingBag,LogOut,Upload,Check} from 'lucide-react';
import {Avatar,Field,Message,SuccessToast} from '../../components/account/AccountFields.jsx';
import {validateName,validatePhone,validatePassword} from '../../utils/accountValidation.js';
import '../../styles/customer-account.css';
function Profile({user,token,request,onUser}){
 const [form,setForm]=useState({name:user.name||'',phone:user.phone||''}),[file,setFile]=useState(null),[remove,setRemove]=useState(false);
 const [preview,setPreview]=useState(null),[errors,setErrors]=useState({}),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(false);
 const sequence=useRef(0);
 useEffect(()=>()=>{sequence.current++;},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:''}));setMessage('');};
 async function choose(picked){
  const requestId=++sequence.current;setError('');setMessage('');
  if(!picked)return;
  if(!['image/jpeg','image/png','image/webp'].includes(picked.type)){setError('Chọn ảnh JPG, PNG hoặc WebP.');return;}
  if(picked.size>AVATAR_MAX_BYTES){setError(`Ảnh đại diện tối đa ${AVATAR_MAX_MB} MB.`);return;}
  setChecking(true);const url=URL.createObjectURL(picked);
  try{
   await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=url;});
   if(sequence.current!==requestId){URL.revokeObjectURL(url);return;}
   setPreview(url);setFile(picked);setRemove(false);
  }catch{URL.revokeObjectURL(url);if(sequence.current===requestId)setError('Không đọc được ảnh. Vui lòng chọn ảnh khác.');}
  finally{if(sequence.current===requestId)setChecking(false);}
 }
 async function save(e){
  e.preventDefault();if(busy||checking)return;
  const next={name:validateName(form.name),phone:validatePhone(form.phone)};setErrors(next);setError('');setMessage('');
  if(Object.values(next).some(Boolean))return;
  setBusy(true);
  try{
   const body=new FormData();body.append('name',form.name);body.append('phone',form.phone);if(file)body.append('avatar',file);else if(remove)body.append('remove_avatar','true');
   const result=await request('/auth/me',{method:'PATCH',token,body});
   onUser(result.user);setForm({name:result.user.name,phone:result.user.phone||''});setFile(null);setPreview(null);setRemove(false);setMessage(result.message);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <form noValidate onSubmit={save} className="kd-account-card">
  <header><span className="kd-account-eyebrow">THÔNG TIN CÁ NHÂN</span><h2>Hồ sơ của bạn</h2><p>Cập nhật thông tin để cửa hàng hỗ trợ bạn thuận tiện hơn.</p></header>
  <div className="kd-account-avatar-row"><Avatar user={remove?{...user,avatar_url:null}:user} preview={preview}/><div><label className="kd-account-upload"><Upload size={16}/>{checking?'Đang đọc ảnh…':'Chọn ảnh mới'}<input type="file" aria-label="Chọn ảnh đại diện" accept="image/jpeg,image/png,image/webp" disabled={busy||checking} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label><small>JPG, PNG, WebP · Tối đa {AVATAR_MAX_MB} MB</small>{(preview||user.avatar_url)&&!remove&&<button className="kd-account-switch" type="button" disabled={busy||checking} onClick={()=>{sequence.current++;setFile(null);setPreview(null);setRemove(true);setMessage('');}}>Xóa ảnh đại diện</button>}</div></div>
  <div className="kd-account-form-grid"><Field id="profile-name" label="Họ và tên" autoComplete="name" value={form.name} maxLength={100} onChange={e=>set('name',e.target.value)} error={errors.name} disabled={busy}/>
  <Field id="profile-phone" label="Số điện thoại (không bắt buộc)" type="tel" autoComplete="tel" value={form.phone} maxLength={25} onChange={e=>set('phone',e.target.value)} error={errors.phone} disabled={busy}/>
  <Field id="profile-email" label="Email đăng nhập" type="email" value={user.email} readOnly hint="Email dùng để đăng nhập và nhận hướng dẫn khôi phục tài khoản."/></div>
  <Message error>{error}</Message><SuccessToast message={message}/>
  <div className="kd-account-save"><button className="kd-account-primary" type="submit" disabled={busy||checking}><Check size={17}/>{busy?'Đang lưu…':'Lưu thay đổi'}</button><span>Thông tin của bạn chỉ được dùng để phục vụ tài khoản và đơn hàng.</span></div>
 </form>;
}
function Password({token,request,onLogout}){
 const nav=useNavigate(),[form,setForm]=useState({current:'',password:'',confirm:''}),[errors,setErrors]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const set=(key,value)=>{setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:''}));};
 async function save(e){
  e.preventDefault();if(busy)return;
  const next={current:!form.current?'Vui lòng nhập mật khẩu hiện tại.':'',password:validatePassword(form.password),confirm:form.password!==form.confirm?'Mật khẩu xác nhận chưa khớp.':''};
  setErrors(next);setError('');if(Object.values(next).some(Boolean))return;
  if(!window.confirm('Đổi mật khẩu và kết thúc các phiên đăng nhập hiện tại?'))return;
  setBusy(true);
  try{await request('/auth/change-password',{method:'POST',token,body:{current_password:form.current,new_password:form.password,confirm_password:form.confirm}});onLogout();nav('/login?passwordChanged=1',{replace:true});}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <form noValidate className="kd-account-card" onSubmit={save}><header><span className="kd-account-eyebrow">BẢO MẬT</span><h2>Đổi mật khẩu</h2><p>Sau khi đổi thành công, bạn sẽ cần đăng nhập lại trên các thiết bị.</p></header><div className="kd-account-password-fields">
  <Field id="current-password" label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={form.current} onChange={e=>set('current',e.target.value)} error={errors.current} disabled={busy}/>
  <Field id="new-password" label="Mật khẩu mới" type="password" autoComplete="new-password" value={form.password} onChange={e=>set('password',e.target.value)} error={errors.password} disabled={busy} hint="Ít nhất 8 ký tự, khác mật khẩu hiện tại."/>
  <Field id="confirm-password" label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} error={errors.confirm} disabled={busy}/>
  </div><Message error>{error}</Message><button className="kd-account-primary" disabled={busy} type="submit">{busy?'Đang cập nhật…':'Đổi mật khẩu'}</button><Link className="kd-account-text-link" to="/forgot-password">Không nhớ mật khẩu hiện tại?</Link></form>;
}
export default function CustomerAccountPage({user,token,request,onUser,onLogout,orders}){
 const [params,setParams]=useSearchParams(),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const tab=['profile','password','orders'].includes(params.get('tab'))?params.get('tab'):'profile';
 useEffect(()=>{
  let live=true;setLoading(true);setError('');
  request('/auth/me',{token}).then(data=>{if(live){setProfile(data);onUser(data);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[token,request,retry,onUser]);
 function updated(data){setProfile(data);onUser(data);}
 const current=profile||user;
 return <section className="kd-customer-account"><div className="kd-account-heading"><span className="kd-account-eyebrow">KD / KHÔNG GIAN CỦA BẠN</span><h1>Tài khoản của tôi</h1><p>Thông tin cá nhân, bảo mật và những đơn hàng của bạn.</p></div><div className="kd-account-layout">
  <aside className="kd-account-sidebar"><div className="kd-account-identity"><Avatar user={current}/><strong>{current?.name}</strong><span>{current?.email}</span></div><nav aria-label="Quản lý tài khoản">{[['profile','Hồ sơ',UserRound],['password','Mật khẩu',LockKeyhole],['orders','Đơn hàng',ShoppingBag]].map(([key,label,Icon])=><button key={key} type="button" aria-current={tab===key?'page':undefined} onClick={()=>setParams(key==='profile'?{}:{tab:key})}><Icon size={18}/>{label}</button>)}</nav><button className="kd-account-logout" type="button" onClick={onLogout}><LogOut size={17}/>Đăng xuất</button>{current?.role==='admin'&&<Link className="kd-account-text-link" to="/admin">Quản trị cửa hàng →</Link>}</aside>
  <div className="kd-account-content">{loading?<div className="kd-account-skeleton" role="status" aria-label="Đang tải hồ sơ"><div/><div/><div/><p>Đang tải thông tin…</p></div>:error?<div className="kd-account-card"><Message error>{error}</Message><button className="kd-account-primary" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>:tab==='profile'?<Profile user={current} token={token} request={request} onUser={updated}/>:tab==='password'?<Password token={token} request={request} onLogout={onLogout}/>:orders}</div>
 </div></section>;
}
