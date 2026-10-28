import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
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
import AdminPage from '../apps/store/src/pages/admin/AdminPage.jsx';
const order={id:901,order_code:'KD-TEST-901',recipient:'Dashboard Test',created_at:'2026-10-28T02:00:00Z',total:100000,status:'PENDING',payment_status:'UNPAID',payment_method:'COD',address:'Test delivery address',phone:'0900000000',items:[]};
const product={id:901,slug:'test-jacket',name:'Test Jacket',brand_id:1,category:'clothing',product_type:'Jacket',price:100000,sale_price:null,status:'active',variants:[{id:1,sku:'TEST-M',size:'M',color:'Black',stock:2,color_hex:'#222222'}],images:[]};
let failure=true;
const snapshot=days=>({days,range:{start:'2026-10-01T17:00:00Z',end:'2026-10-28T02:00:00Z'},generated_at:'2026-10-28T02:00:00Z',current:{orders:days,valid_orders:days,paid_value:100000,order_value:200000,customers:2},previous:{orders:0,valid_orders:0,paid_value:0,order_value:0,customers:0},trend:Array.from({length:days},(_,i)=>({day:new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10),orders:i===0?days:0,paid_value:i===0?100000:0})),pipeline:[{status:'PENDING',count:days}],operations:{pending:1,to_ship:0,awaiting_transfer:0,refunds:0,active_products:1,draft_products:0,missing_cover:1,missing_skus:0,low_stock:1,out_of_stock:0},low_stock:[{product_id:901,name:'Test Jacket',sku:'TEST-M',size:'M',color:'Black',stock:2}],top_products:[{product_id:901,name:'Test Jacket',units:3,value:300000}],recent_orders:[order]});
async function request(path){
 if(path.startsWith('/admin/dashboard')){
  const days=Number(new URLSearchParams(path.split('?')[1]).get('days'));
  if(days===90&&failure){failure=false;throw Error('Test temporary connection failure');}
  return snapshot(days);
 }
 if(path.startsWith('/admin/products'))return [product];
 if(path.startsWith('/admin/orders'))return [order];
 if(path==='/brands')return [{id:1,name:'Test Brand'}];
 return [];
}
if(import.meta.env.DEV){
 createRoot(document.getElementById('root')).render(<MemoryRouter><AdminPage user={{name:'Test Admin',email:'admin@example.test'}} token="test-only" request={request} refreshCatalog={async()=>{}}/></MemoryRouter>);
 const wait=()=>new Promise(resolve=>setTimeout(resolve,80));
 const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error('Timed out waiting for UI');};
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.includes(text));
 const click=async text=>{const b=button(text);assert(b,'Missing button '+text);b.click();await wait();};
 (async()=>{
  try{
   await until(()=>document.querySelector('.kd-ops-kpis'));
   assert(document.querySelectorAll('.kd-ops-kpis article').length===4,'Four KPI cards');
   assert(document.documentElement.scrollWidth<=window.innerWidth+2,'Dashboard must fit viewport');
   const period=document.querySelector('#kd-dashboard-period');
   period.value='7';period.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>document.querySelector('.kd-ops-kpis article:nth-child(2)>strong')?.textContent==='7');
   assert(!button('Export report').disabled,'Export available for loaded period');
   await click('Confirm new orders');
   await until(()=>document.querySelector('.kd-order-card'));
   assert(document.querySelector('.kd-order-card').textContent.includes('KD-TEST-901'),'Order action opens matching queue');
   await click('Overview');await until(()=>document.querySelector('.kd-ops-kpis'));
   await click('Edit stock');await until(()=>document.querySelector('[role="dialog"]'));
   assert(document.querySelector('[role="dialog"]').textContent.includes('Test Jacket'),'Stock action opens product editor');
   document.querySelector('[aria-label="Close product editor"]').click();await wait();
   await click('Overview');await until(()=>document.querySelector('.kd-ops-kpis'));
   const select=document.querySelector('#kd-dashboard-period');select.value='90';select.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>button('Try again'));
   assert(!document.querySelector('.kd-ops-kpis'),'Do not display fabricated metrics on API failure');
   await click('Try again');await until(()=>document.querySelector('.kd-ops-kpis article:nth-child(2)>strong')?.textContent==='90');
   const output=document.createElement('output');output.textContent='DASHBOARD_CHECKS_PASSED';document.body.append(output);
  }catch(error){const output=document.createElement('output');output.textContent='DASHBOARD_CHECKS_FAILED: '+error.message;document.body.append(output);}
 })();
}
