import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import CustomerAccountPage from '../apps/store/src/pages/account/CustomerAccountPage.jsx';
import OrdersPanel from '../apps/store/src/pages/admin/OrdersPanel.jsx';
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
import '../apps/store/src/styles/admin-dashboard.css';
import '../apps/store/src/styles/admin-reports.css';
const user={id:42,name:'Nguyễn Hoàng Anh',email:'member@example.test',role:'user',created_at:'2020-01-01'};
const tiers=[['bronze','Đồng',0],['silver','Bạc',2000000],['gold','Vàng',5000000],['diamond','Kim cương',15000000],['platinum','Platinum',30000000]].map(([code,name,min_spend],i)=>({code,name,min_spend,rank:i+1,benefits:[]}));
let current=0,failMembership=true,failPayment=true,lastBody=null;
const calls=[];
async function request(path){
 if(path==='/auth/me')return user;
 if(path==='/account/membership'){
  if(failMembership){failMembership=false;throw Error('Tạm thời chưa tải được thẻ.');}
  const tier=tiers[current],next=tiers[current+1]||null;
  return {name:user.name,member_number:'KD-00000042',member_since:user.created_at,current:tier,next,tiers,
   lifetime_spend:tier.min_spend,completed_orders:current?3:0,remaining:next?next.min_spend-tier.min_spend:0,progress:next?0:100};
 }
 throw Error('Unexpected account request '+path);
}
const noop=()=>{};
const firstOrder={id:50,order_code:'KD-20261102-000000000050',created_at:'2026-11-02T06:00:00Z',status:'DELIVERED',payment_method:'COD',payment_status:'UNPAID',recipient:user.name,phone:'0912345678',address:'12 Nguyễn Huệ, Thành phố Hồ Chí Minh',email:user.email,total:2000000,items:[{product_name:'Áo sơ mi cotton',size:'M',quantity:1,unit_price:2000000}]};
const audit=[{id:1,action:'REFUND',actor_id:1,actor_name:'KD Admin',reason:'Đã kiểm tra hoàn tiền theo biên nhận.',reference:'REF-01',restocked:false,created_at:'2026-11-02T07:00:00Z'}];
function AdminHarness(){
 const [order,setOrder]=useState(firstOrder),[busy,setBusy]=useState(false);
 const api=React.useCallback(async(path,options={})=>{
  calls.push(path);lastBody=options.body;
  if(path.endsWith('/audit'))return {items:audit};
  if(path.endsWith('/payment')&&failPayment){failPayment=false;throw Error('Kết nối bị gián đoạn, vui lòng thử lại.');}
  if(path.endsWith('/payment'))return {...firstOrder,payment_status:'PAID'};
  if(path.endsWith('/return'))return {...firstOrder,status:'RETURNED',payment_status:'REFUND_PENDING'};
  if(path.endsWith('/refund'))return {...firstOrder,status:'RETURNED',payment_status:'REFUNDED'};
  throw Error('Unexpected admin request '+path);
 },[]);
 async function perform(operation){setBusy(true);try{setOrder(await operation());return true;}catch{return false;}finally{setBusy(false);}}
 return <div className="kd-ops"><aside className="kd-ops-sidebar">KD ADMIN</aside><main className="kd-ops-main"><div className="kd-ops-body"><div className="kd-ops-panel-content"><OrdersPanel orders={[order]} api={api} perform={perform} busy={busy} initialOrderId={50}/></div></div></main></div>;
}
if(import.meta.env.DEV){
 const root=createRoot(document.getElementById('root'));
 const wait=()=>new Promise(resolve=>setTimeout(resolve,90));
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const until=async(fn,label)=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error('Timed out: '+label);};
 const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===text);
 const click=async text=>{assert(button(text),'Missing button '+text);button(text).focus();button(text).click();await wait();};
 const fill=async(id,value)=>{const field=document.getElementById(id);assert(field,'Missing field '+id);Object.getOwnPropertyDescriptor(field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));await wait();};
 const fit=label=>assert(document.documentElement.scrollWidth<=window.innerWidth+2,label+' fits viewport');
 const dialogFit=()=>{const rect=document.querySelector('[role=dialog]').getBoundingClientRect();assert(rect.left>=0&&rect.right<=innerWidth&&rect.height<=innerHeight,'Dialog fits screen');};
 (async()=>{
  try{
   assert(window.innerWidth===Number(new URLSearchParams(location.search).get('viewport')),'Exact viewport');
   root.render(<MemoryRouter><CustomerAccountPage user={user} token="test" request={request} onUser={noop} onLogout={noop}/></MemoryRouter>);
   await until(()=>button('Thành viên'),'membership navigation');await click('Thành viên');
   await until(()=>button('Thử tải thẻ'),'membership error');await click('Thử tải thẻ');
   await until(()=>document.querySelector('.kd-member-card-bronze'),'bronze card');
   assert(document.body.textContent.includes('KD-00000042'),'Member number visible');
   assert(document.body.textContent.includes('2020'),'Member since year');
   assert(button('Cập nhật').getBoundingClientRect().height>=44,'Refresh tap size');
   assert(document.querySelector('.kd-member-first-order'),'Empty spend guidance');
   fit('Bronze account');
   assert(getComputedStyle(document.querySelector('.kd-member-progress-track span')).animationName==='none','Reduced motion preference respected');
   for(current=1;current<5;current++){
    await click('Cập nhật');await until(()=>document.querySelector('.kd-member-card-'+tiers[current].code),'tier '+current);fit('Tier '+current);
    const card=document.querySelector('.kd-member-card').getBoundingClientRect();assert(Math.abs(card.width/card.height-1.586)<.03,'Membership card ratio');
   }
   assert(document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='100','Maximum tier progress is finite');
   assert(document.body.textContent.includes('hạng cao nhất'),'Maximum tier guidance');
   root.render(<MemoryRouter key="admin"><AdminHarness/></MemoryRouter>);
   await until(()=>button('Xác nhận thu tiền COD'),'COD action');fit('Admin order');
   await click('Xác nhận thu tiền COD');dialogFit();
   const dialog=document.querySelector('[role=dialog]');assert(dialog.contains(document.activeElement),'Dialog receives keyboard focus');
   document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}));assert(document.activeElement===button('Xác nhận và lưu'),'Shift Tab wraps to last dialog button');
   document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));assert(document.activeElement===document.querySelector('[aria-label="Đóng hộp thoại"]'),'Tab wraps to dialog close button');
   assert(parseFloat(getComputedStyle(document.getElementById('order-action-reason')).fontSize)>=16,'Form input 16px');
   await click('Xác nhận và lưu');assert(calls.length===0,'Invalid reason prevents request');
   await fill('order-action-reason','Đã đối chiếu tiền thu hộ với đơn vị giao hàng.');
   await click('Xác nhận và lưu');assert(calls.length===0,'Confirmation required');
   document.querySelector('.kd-order-action-check input').click();await wait();
   await click('Xác nhận và lưu');assert(document.querySelector('[role=alert]'),'Failed request visible');
   assert(document.getElementById('order-action-reason').value.includes('đối chiếu'),'Failed request preserves draft');
   await click('Xác nhận và lưu');await until(()=>!document.querySelector('[role=dialog]'),'Payment dialog closes');
   assert(!button('Xác nhận thu tiền COD'),'Paid order cannot be verified again');
   await click('Ghi nhận hoàn trả');dialogFit();
   assert(!document.querySelectorAll('.kd-order-action-check input')[0].checked,'Restock defaults off');
   await fill('order-action-reason','Đã nhận đủ hàng hoàn và kiểm tra chất lượng.');
   document.querySelectorAll('.kd-order-action-check input')[0].click();document.querySelectorAll('.kd-order-action-check input')[1].click();await wait();
   await click('Xác nhận và lưu');await until(()=>button('Xác nhận đã hoàn tiền'),'Return completed');assert(lastBody.restock===true,'Explicit restock sent');
   await click('Xác nhận đã hoàn tiền');dialogFit();
   await fill('order-action-reason','Đã hoàn đủ tiền và đối chiếu biên nhận.');
   document.querySelector('.kd-order-action-check input').click();await wait();
   const before=calls.length;await click('Xác nhận và lưu');assert(calls.length===before,'Refund reference required');
   await fill('order-action-reference','REF-01');await click('Xác nhận và lưu');
   await until(()=>!document.querySelector('[role=dialog]'),'Refund completed');
   assert(!button('Xác nhận đã hoàn tiền'),'Refund cannot be submitted again');fit('Returned order');
   await click('Lịch sử xử lý');await until(()=>document.body.textContent.includes('KD Admin'),'Audit loaded');dialogFit();
   document.querySelector('[aria-label="Đóng hộp thoại"]').click();await wait();
   assert(document.activeElement===button('Lịch sử xử lý'),'Focus restored to triggering button');
   const output=document.createElement('output');output.textContent='MEMBERSHIP_CHECKS_PASSED';document.body.append(output);
  }catch(error){const output=document.createElement('output');output.textContent='MEMBERSHIP_CHECKS_FAILED: '+error.message;document.body.append(output);}
 })();
}
