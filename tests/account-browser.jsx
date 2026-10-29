import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import CustomerAccountPage from '../apps/store/src/pages/account/CustomerAccountPage.jsx';
import AuthPage from '../apps/store/src/pages/account/AuthPage.jsx';
import PasswordRecoveryPage from '../apps/store/src/pages/account/PasswordRecoveryPage.jsx';
import '../apps/store/src/style.css';
import '../apps/store/src/styles/sprint2.css';
import '../apps/store/src/styles/shop-phase2.css';
import '../apps/store/src/styles/admin-phase2.css';
import '../apps/store/src/styles/product-images.css';
import '../apps/store/src/styles/admin-delete.css';
import '../apps/store/src/styles/readability-motion.css';
import '../apps/store/src/styles/editorial-home.css';
import '../apps/store/src/styles/retail-merge.css';
import '../apps/store/src/styles/retail-shoe-fallback.css';
import '../apps/store/src/styles/admin-workspace.css';
import '../apps/store/src/styles/checkout-cart.css';
import '../apps/store/src/styles/order-management.css';
import '../apps/store/src/styles/product-gallery-v2.css';
import '../apps/store/src/styles/brand-refresh.css';
import '../apps/store/src/styles/collections.css';
import '../apps/store/src/styles/white-background.css';
import '../apps/store/src/styles/home-products.css';
const user={id:301,name:'Khách thử nghiệm',email:'customer@example.test',phone:null,avatar_url:null,role:'user',status:'active'};
const counts={register:0,profile:0,password:0,forgot:0,reset:0};
let failedProfile=true,profile=user,loggedIn=null,loggedOut=false,confirmed=false,resetDone=false;
const wait=()=>new Promise(resolve=>setTimeout(resolve,80));
const assert=(value,message)=>{if(!value)throw Error(message);};
const until=async(fn,label='UI')=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error('Timed out: '+label);};
const button=text=>[...document.querySelectorAll('button')].find(element=>element.textContent.trim()===text);
async function click(text){assert(button(text),'Missing button '+text);button(text).click();await wait();}
async function fill(id,value){
 const input=document.getElementById(id);assert(input,'Missing input '+id);
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
 input.dispatchEvent(new Event('input',{bubbles:true}));await wait();
}
async function submit(){document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();}
const request=async(path,{method,body}={})=>{
 if(path==='/auth/register'){counts.register++;assert(!body.phone,'Registration does not require a phone');return {user,token:'test'};}
 if(path==='/auth/me'&&method!=='PATCH'){
  await wait();
  if(failedProfile){failedProfile=false;throw Error('Kết nối tạm thời bị gián đoạn.');}
  return profile;
 }
 if(path==='/auth/me'){
  counts.profile++;assert(body instanceof FormData,'Profile uses multipart for one Save');
  assert(!body.has('email'),'Read-only email is never submitted');
  if(body.has('avatar'))assert(body.get('avatar').size>2*1024*1024,'The UI accepts an avatar larger than the old limit');
  profile={...profile,name:body.get('name'),phone:body.get('phone'),avatar_url:body.has('avatar')?'/media/avatars/11111111-1111-1111-1111-111111111111.png':body.get('remove_avatar')==='true'?null:profile.avatar_url};
  return {user:profile,message:'Đã cập nhật hồ sơ.'};
 }
 if(path==='/auth/change-password'){counts.password++;return {message:'Đã đổi mật khẩu.'};}
 if(path==='/auth/forgot-password'){counts.forgot++;return {message:'Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'};}
 if(path==='/auth/reset-password'){
  counts.reset++;assert(body.token==='a'.repeat(64),'Submit reset token from in-memory state');
  if(counts.reset===1)throw Error('Liên kết không hợp lệ hoặc đã hết hạn.');
  return {message:'Đã đặt lại mật khẩu.'};
 }
 throw Error('Unexpected request '+path);
};
if(import.meta.env.DEV){
 const root=createRoot(document.getElementById('root'));
 const render=(key,children)=>root.render(<MemoryRouter key={key}>{children}</MemoryRouter>);
 (async()=>{
  try{
   render('auth',<AuthPage request={request} onLogin={data=>{loggedIn=data;}}/>);
   await until(()=>document.getElementById('login-email'));
   await fill('login-password','VisiblePassword2026');
   const eye=()=>document.querySelector('[aria-controls="login-password"]');
   assert(document.getElementById('login-password').type==='password','Password starts masked');
   eye().click();await wait();assert(document.getElementById('login-password').type==='text','Login eye reveals password');
   assert(document.getElementById('login-password').value==='VisiblePassword2026','Toggling preserves input');
   assert(counts.register===0&&!loggedIn,'Eye never submits the form');
   eye().click();await wait();assert(document.getElementById('login-password').type==='password','Login eye hides password');
   await submit();assert(document.getElementById('login-email-error'),'Inline email error');
   eye().click();await wait();
   await click('Chưa có tài khoản? Đăng ký');
   assert(document.getElementById('login-password').type==='password','Switching to registration hides the password');
   eye().focus();assert(document.activeElement===eye(),'Eye is keyboard focusable');
   eye().click();await wait();assert(document.getElementById('login-password').type==='text','Registration eye reveals password');
   eye().click();await wait();assert(document.getElementById('login-password').type==='password','Registration eye hides password');
   await fill('register-name','Khách thử nghiệm');await fill('login-email',user.email);await fill('login-password','Password2026');
   await submit();assert(counts.register===1&&loggedIn?.token==='test','Registration signs in');
   render('profile',<CustomerAccountPage user={user} token="test" request={request} onUser={()=>{}} onLogout={()=>{loggedOut=true;}} orders={<p>Existing orders</p>}/>);
   await until(()=>button('Thử lại'),'profile retry');await click('Thử lại');
   await until(()=>document.getElementById('profile-email'),'profile form');
   assert(document.getElementById('profile-email').readOnly,'Email is read-only');
   assert(document.querySelector('[aria-label="Ảnh đại diện mặc định"]'),'Initial avatar fallback');
   assert(document.documentElement.scrollWidth<=window.innerWidth+2,'Account fits viewport');
   await fill('profile-name','');await submit();assert(counts.profile===0&&document.getElementById('profile-name-error'),'Validate profile before request');
   await fill('profile-name','Tên đã sửa');await fill('profile-phone','abc');await submit();assert(document.getElementById('profile-phone-error'),'Validate phone');
   await fill('profile-phone','0912345678');
   const picker=()=>document.querySelector('input[type=file]');
   const selectFile=async file=>{const transfer=new DataTransfer();transfer.items.add(file);picker().files=transfer.files;picker().dispatchEvent(new Event('change',{bubbles:true}));await wait();};
   await selectFile(new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}));
   assert(document.querySelector('[role=alert]')?.textContent.includes('JPG'),'Disallow SVG');
   const canvas=document.createElement('canvas');canvas.width=canvas.height=4;
   canvas.getContext('2d').fillRect(0,0,4,4);
   const bytes=Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));
   await selectFile(new File([bytes,new Uint8Array(10*1024*1024+1)],'too-large.png',{type:'image/png'}));
   assert(document.querySelector('[role=alert]')?.textContent.includes('10 MB'),'Reject files above the updated limit');
   await selectFile(new File([bytes,new Uint8Array(3*1024*1024-bytes.length)],'avatar.png',{type:'image/png'}));
   await until(()=>document.querySelector('.kd-account-avatar-row img')?.src.startsWith('blob:'),'avatar preview');
   await submit();await until(()=>document.querySelector('.kd-account-toast'),'save toast');
   assert(counts.profile===1&&profile.name==='Tên đã sửa'&&profile.avatar_url,'One request saves name, phone and avatar');
   await click('Xóa ảnh đại diện');await submit();
   assert(counts.profile===2&&profile.avatar_url===null,'Remove avatar uses same save action');
   await click('Mật khẩu');
   await fill('current-password','Password2026');await fill('new-password','Changed2026');await fill('confirm-password','Mismatch2026');
   await submit();assert(counts.password===0&&document.getElementById('confirm-password-error'),'Validate password confirmation');
   await fill('confirm-password','Changed2026');
   window.confirm=()=>confirmed;
   await submit();assert(counts.password===0,'Cancel confirmation does not change password');
   confirmed=true;await submit();assert(counts.password===1&&loggedOut,'Password change signs out');
   render('forgot',<PasswordRecoveryPage request={request}/>);
   await until(()=>document.getElementById('forgot-email'));await fill('forgot-email','invalid');await submit();assert(counts.forgot===0,'Invalid email is not sent');
   await fill('forgot-email',user.email);await submit();assert(counts.forgot===1&&document.querySelector('[role=status]')?.textContent.includes('Nếu email'),'Generic recovery response');
   window.history.replaceState(null,'',window.location.pathname+'#token='+'a'.repeat(64));
   render('reset',<PasswordRecoveryPage request={request} reset onReset={()=>{resetDone=true;}}/>);
   await until(()=>document.getElementById('reset-password'));
   assert(!window.location.hash,'Reset secret removed from address bar');
   await fill('reset-password','NewPassword2026');await fill('reset-confirm','NewPassword2026');await submit();
   assert(document.querySelector('[role=alert]')?.textContent.includes('hết hạn'),'Show reset API errors');
   await submit();assert(resetDone&&!document.getElementById('reset-password'),'Successful reset clears secret form');
   assert(document.documentElement.scrollWidth<=window.innerWidth+2,'Recovery fits viewport');
   const output=document.createElement('output');output.textContent='ACCOUNT_CHECKS_PASSED';document.body.append(output);
  }catch(error){const output=document.createElement('output');output.textContent='ACCOUNT_CHECKS_FAILED: '+error.message;document.body.append(output);}
 })();
}
