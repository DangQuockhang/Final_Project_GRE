import React from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {apiBase} from '@kd/catalog';
export function Field({label,id,error,hint,type='text',...props}){
 const [visible,setVisible]=React.useState(false);
 const password=type==='password';
 React.useEffect(()=>setVisible(false),[id,type,props.autoComplete,props.disabled]);
 return <div className="kd-account-field">
  <label htmlFor={id}>{label}</label>
  <div className={'kd-account-input-wrap'+(password?' has-password':'')}>
   <input id={id} type={password&&visible?'text':type} aria-invalid={Boolean(error)} aria-describedby={error?id+'-error':hint?id+'-hint':undefined} {...props}/>
   {password&&<button type="button" className="kd-account-password-toggle" disabled={props.disabled}
    aria-label={visible?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={visible} aria-controls={id}
    onClick={()=>setVisible(value=>!value)}>{visible?<EyeOff size={19} aria-hidden="true"/>:<Eye size={19} aria-hidden="true"/>}</button>}
  </div>
  {error?<small id={id+'-error'} className="kd-account-field-error">{error}</small>:hint?<small id={id+'-hint'}>{hint}</small>:null}
 </div>;
}
export function Message({error,children}){return children?<div className={'kd-account-message '+(error?'is-error':'is-success')} role={error?'alert':'status'}>{children}</div>:null;}
export function Avatar({user,preview=null}){
 let src=preview;
 if(!src&&/^\/media\/avatars\/[a-f0-9-]{36}\.(png|jpg|webp)$/i.test(user?.avatar_url||''))src=new URL(user.avatar_url,new URL(import.meta.env.VITE_API_URL||apiBase,window.location.origin).origin).href;
 const [broken,setBroken]=React.useState(false);
 React.useEffect(()=>setBroken(false),[src]);
 return <span className="kd-account-avatar">{src&&!broken?<img src={src} alt={'Ảnh đại diện của '+(user?.name||'bạn')} onError={()=>setBroken(true)}/>:<span aria-label="Ảnh đại diện mặc định">{(user?.name||'K').trim().slice(0,1).toLocaleUpperCase('vi')}</span>}</span>;
}

export function SuccessToast({message}){
 const [visible,setVisible]=React.useState(Boolean(message));
 React.useEffect(()=>{
  setVisible(Boolean(message));
  if(!message)return;
  const timer=window.setTimeout(()=>setVisible(false),6000);
  return()=>window.clearTimeout(timer);
 },[message]);
 return visible&&message?<div className="kd-account-toast" role="status"><span>{message}</span><button type="button" aria-label="Đóng thông báo" onClick={()=>setVisible(false)}>×</button></div>:null;
}
