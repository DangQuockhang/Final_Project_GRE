import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,useLocation} from 'react-router-dom';
import CustomerAccountPage from '../apps/store/src/pages/account/CustomerAccountPage.jsx';
import CustomerOrders from '../apps/store/src/pages/account/CustomerOrders.jsx';
import DeliveryFields from '../apps/store/src/components/account/DeliveryFields.jsx';
import SavedAddressNotice from '../apps/store/src/components/checkout/SavedAddressNotice.jsx';
import useCheckoutAddress from '../apps/store/src/hooks/useCheckoutAddress.js';
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
const user={id:41,name:'Nguyễn An',email:'customer@example.test',phone:'0912345678',role:'user'};
const originalAddress={recipient:'Nguyễn An',phone:'0912345678',address:'12 Nguyễn Huệ, Phường Bến Nghé, Thành phố Hồ Chí Minh'};
let address=null,addressFailure=true,saveFailure=true,orderFailure=false,slowResolve=null,slowAddress=false,confirmed=false;
const calls=[],counts={save:0,remove:0};
const order={id:51,order_code:'KD-20261102-000000000051',recipient:'Nguyễn An',phone:'0912345678',address:originalAddress.address,created_at:'2026-11-01T06:00:00Z',total:130000,status:'PENDING',payment_method:'BANK_TRANSFER',payment_status:'AWAITING_TRANSFER',items:[{product_name:'Áo sơ mi chất liệu cotton dài tay',brand_name:'KD',size:'M',color:'Standard',quantity:1,unit_price:130000}]};
async function request(path,{method='GET',body}={}){
 calls.push(path);
 if(path==='/auth/me')return user;
 if(path==='/auth/address'){
  if(method==='GET'){
   if(slowAddress){slowAddress=false;return new Promise(resolve=>{slowResolve=()=>resolve({address:originalAddress});});}
   if(addressFailure){addressFailure=false;throw Error('Không thể kết nối để tải địa chỉ.');}
   return {address};
  }
  if(method==='PUT'){
   counts.save++;
   if(saveFailure){saveFailure=false;throw Error('Kết nối tạm thời bị gián đoạn, hãy thử lưu lại.');}
   address={...body,updated_at:'2026-11-01T00:00:00Z'};return {address,message:'Default address saved.'};
  }
  if(method==='DELETE'){counts.remove++;address=null;return {address:null,message:'Đã xóa địa chỉ mặc định.'};}
 }
 if(path.startsWith('/account/orders')){
  if(orderFailure){orderFailure=false;throw Error('Không tải được đơn hàng.');}
  const p=new URLSearchParams(path.split('?')[1]),page=Number(p.get('page')||1),status=p.get('status')||'all',total=status==='CANCELLED'?0:23;
  return {items:total?[{...order,id:page===1?51:52,order_code:page===1?order.order_code:'KD-20261102-000000000052'}]:[],pagination:{page,page_size:10,total,pages:total?3:0}};
 }
 if(path==='/payment-methods')throw Error('Hướng dẫn thanh toán tạm thời không khả dụng.');
 throw Error('Unexpected request '+path);
}
const noop=()=>{};
function Probe({boot}){const location=useLocation();return <output hidden id="foundation-location" data-boot={boot}>{location.pathname+location.search}</output>;}
function CheckoutHarness(){
 const delivery=useCheckoutAddress({user,token:'fixture-token',request});
 return <section className="kd-customer-account"><form className="kd-account-card" onSubmit={event=>event.preventDefault()}><SavedAddressNotice state={delivery}/><DeliveryFields prefix="checkout-test" value={delivery.form} onChange={delivery.change}/></form></section>;
}
if(import.meta.env.DEV){
 const root=createRoot(document.getElementById('root'));
 const wait=()=>new Promise(resolve=>setTimeout(resolve,80));
 const until=async(fn,label)=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error('Timed out: '+label);};
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
 const click=async text=>{const element=button(text);assert(element,'Missing button '+text);element.click();await wait();};
 const fill=async(id,value)=>{
  const element=document.getElementById(id);assert(element,'Missing field '+id);
  Object.getOwnPropertyDescriptor(element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(element,value);
  element.dispatchEvent(new Event('input',{bubbles:true}));await wait();
 };
 const submit=async()=>{document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();};
 const mount=(key,path,children)=>root.render(<MemoryRouter key={key} initialEntries={[path]}><Probe boot={key}/>{children}</MemoryRouter>);
 const account=<CustomerAccountPage user={user} token="fixture-token" request={request} onUser={noop} onLogout={noop} orders={<CustomerOrders token="fixture-token" request={request}/>}/>;
 const fit=label=>assert(document.documentElement.scrollWidth<=window.innerWidth+2,label+' fits viewport');
 (async()=>{
  const originalConfirm=window.confirm;window.confirm=()=>confirmed;
  try{
   assert(window.innerWidth===Number(new URLSearchParams(window.location.search).get('viewport')),'Browser must use the requested viewport width');
   mount('address','/account?tab=address',account);
   await until(()=>button('Try again'),'address load error');await click('Try again');
   await until(()=>document.getElementById('account-address-recipient'),'address form');
   fit('Address');
   assert(document.querySelector('.kd-account-card header p').textContent.includes('No saved address'),'Helpful address empty state');
   assert(parseFloat(getComputedStyle(document.getElementById('account-address-phone')).fontSize)>=16,'Mobile delivery input is at least 16px');
   assert(button('Save address').getBoundingClientRect().height>=44,'Save target at least 44px');
   await fill('account-address-phone','abcdefghi');await submit();
   assert(counts.save===0&&document.getElementById('account-address-phone-error'),'Invalid phone never reaches API');
   await fill('account-address-phone',originalAddress.phone);await fill('account-address-address',originalAddress.address);
   await submit();assert(counts.save===1,'First save attempted');
   assert(document.querySelector('[role="alert"]')?.textContent.includes('gián đoạn'),'Save failure has a message');
   assert(document.getElementById('account-address-address').value===originalAddress.address,'Failed save retains typed address');
   await submit();await until(()=>button('Remove address'),'saved address');
   assert(document.querySelector('[role="status"]')?.textContent.includes('Default address saved'),'Save announces success');
   await click('Remove address');assert(counts.remove===0,'Cancel deletion keeps saved address');
   confirmed=true;await click('Remove address');assert(counts.remove===1&&!button('Remove address'),'Confirmed deletion clears default address');
   await fill('account-address-address',originalAddress.address);await submit();
   await click('Orders');await until(()=>document.querySelector('.kd-order-card'),'history');
   fit('Order history');
   assert(document.querySelector('.kd-order-card').textContent.includes(order.order_code),'Payment configuration failure does not hide orders');
   assert(document.querySelector('.kd-customer-orders').textContent.includes('still shown'),'Payment failure is explained separately');
   await click('Next');await until(()=>document.querySelector('.kd-order-card h3')?.textContent.includes('000000000052'),'next page');
   assert(document.querySelector('#foundation-location').textContent.includes('page=2'),'Pagination stored in URL');
   orderFailure=true;
   const filter=document.querySelector('[aria-label="Filter order status"]');filter.value='DELIVERED';filter.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>button('Retry orders'),'history failure');
   assert(!document.querySelector('.kd-customer-orders-empty'),'An API error is not presented as empty history');
   await click('Retry orders');await until(()=>document.querySelector('.kd-order-card'),'history retry');
   assert(!document.querySelector('#foundation-location').textContent.includes('page=2'),'Changing status resets page');
   const select=document.querySelector('[aria-label="Filter order status"]');select.value='CANCELLED';select.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>button('View all orders'),'filtered empty state');
   await click('View all orders');await until(()=>document.querySelector('.kd-order-card'),'reset history filter');
   mount('checkout','/checkout',<CheckoutHarness/>);
   await until(()=>document.querySelector('#foundation-location')?.dataset.boot==='checkout'&&document.getElementById('checkout-test-address')?.value===originalAddress.address,'checkout prefill');
   fit('Checkout delivery');
   assert(document.getElementById('checkout-test-phone').value===originalAddress.phone,'Default phone prefilled');
   await fill('checkout-test-address','Address riêng cho đơn hàng này, TP.HCM');
   assert(address.address===originalAddress.address,'Checkout edits do not overwrite saved address');
   await click('Use default address');assert(document.getElementById('checkout-test-address').value===originalAddress.address,'Explicit restore of saved address');
   slowAddress=true;mount('slow','/checkout',<CheckoutHarness/>);
   await until(()=>document.querySelector('#foundation-location')?.dataset.boot==='slow'&&slowResolve,'slow default-address request');
   await fill('checkout-test-recipient','Người nhận tự nhập');await fill('checkout-test-address','Address khách tự nhập trước khi API trả về');
   slowResolve();await wait();
   assert(document.getElementById('checkout-test-recipient').value==='Người nhận tự nhập','Late response preserves edited recipient');
   assert(document.getElementById('checkout-test-address').value==='Address khách tự nhập trước khi API trả về','Late response preserves edited address');
   fit('Slow checkout');
   addressFailure=true;mount('failed-checkout','/checkout',<CheckoutHarness/>);
   await until(()=>document.querySelector('#foundation-location')?.dataset.boot==='failed-checkout'&&button('Try again'),'checkout error');
   assert(document.getElementById('checkout-test-phone').value===user.phone,'Profile phone remains available when address fetch fails');
   await fill('checkout-test-address','Address nhập tay vẫn dùng được, TP.HCM');
   await click('Try again');await until(()=>button('Use default address'),'checkout retry');
   assert(document.getElementById('checkout-test-address').value==='Address nhập tay vẫn dùng được, TP.HCM','Retry does not replace user input');
   const output=document.createElement('output');output.textContent='FOUNDATION_CHECKS_PASSED';document.body.append(output);
  }catch(error){const output=document.createElement('output');output.textContent='FOUNDATION_CHECKS_FAILED: '+error.message;document.body.append(output);}
  finally{window.confirm=originalConfirm;}
 })();
}
