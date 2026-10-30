import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
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

let reportFailure=false;
const calls=[];
const reportData=(kind,params)=>{
 const page=Number(params.get('page')||1),empty=params.get('search')==='no-match',total=empty?0:26;
 const items=empty?[]:kind==='orders'?[{...order,item_count:2,email:'buyer@example.test'}]:
  kind==='inventory'?[{id:1,product_id:901,name:'Test Jacket',brand_name:'Test Brand',sku:'TEST-M',color:'Black',size:'M',stock:2}]:
  kind==='best-sellers'?[{product_id:901,name:'Test Jacket',brand_name:'Test Brand',status:'active',units:3,order_count:2,value:300000,paid_value:100000}]:
  [{product_id:901,name:'Test Jacket',brand_name:'Test Brand',category:'clothing',product_type:'Jacket',status:'active',variant_count:1,stock:2,price:100000,image_url:null}];
 return {kind,items,summary:{total,pending:1,awaiting_transfer:0,units:3,sold_out:0,value:300000,drafts:0,missing_cover:1,missing_skus:0},pagination:{page,page_size:25,total,pages:empty?0:2}};
};
async function request(path){
 calls.push(path);
 if(path.startsWith('/admin/dashboard')){
  const days=Number(new URLSearchParams(path.split('?')[1]).get('days'));
  if(days===90&&failure){failure=false;throw Error('Test temporary connection failure');}
  return snapshot(days);
 }
 if(path.startsWith('/admin/reports/')){
  if(reportFailure){reportFailure=false;throw Error('Report connection failure');}
  const [pathname,query]=path.split('?');
  return reportData(pathname.split('/').at(-1),new URLSearchParams(query));
 }
 if(path.startsWith('/admin/products'))return [structuredClone(product)];
 if(path.startsWith('/admin/orders'))return [order];
 if(path==='/brands')return [{id:1,name:'Test Brand'}];
 return [];
}
function RouteProbe(){
 const location=useLocation(),navigate=useNavigate();
 return <div hidden><output id="test-route">{location.pathname+location.search}</output><button onClick={()=>navigate(-1)}>Browser back</button></div>;
}
if(import.meta.env.DEV){
 const root=createRoot(document.getElementById('root'));
 const mount=(path,key)=>root.render(<MemoryRouter key={key} initialEntries={[path]}><RouteProbe/><AdminPage user={{name:'Test Admin',email:'admin@example.test'}} token="test-only" request={request} refreshCatalog={async()=>{}}/></MemoryRouter>);
 mount('/admin','initial');
 const wait=()=>new Promise(resolve=>setTimeout(resolve,80));
 const until=async(fn,message)=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error('Timed out: '+message);};
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text||node.textContent.includes(text));
 const click=async text=>{const node=button(text);assert(node,'Missing button '+text);node.click();await wait();};
 const follow=async selector=>{const node=document.querySelector(selector);assert(node,'Missing link '+selector);node.click();await wait();};
 const route=()=>document.querySelector('#test-route')?.textContent||'';
 const ready=()=>document.querySelector('.kd-report-table');
 const choose=async(label,value)=>{
  const node=[...document.querySelectorAll('.kd-report-toolbar>label')].find(node=>node.firstChild.textContent===label)?.querySelector('select');
  assert(node,'Missing filter '+label);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));await wait();
 };
 const input=async(node,value)=>{
  assert(node,'Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);
  node.dispatchEvent(new Event('input',{bubbles:true}));await wait();
 };
 (async()=>{
  try{
   await until(()=>document.querySelector('.kd-ops-kpis'),'overview');
   assert(document.querySelectorAll('.kd-ops-detail-card').length===4,'Four report links');
   assert(!document.querySelector('.kd-ops-table-grid'),'Long tables removed from overview');
   assert(document.documentElement.scrollWidth<=window.innerWidth+2,'Overview fits viewport');
   assert(getComputedStyle(document.querySelector('.kd-ops-main')).backgroundColor==='rgb(226, 233, 226)','Admin canvas overrides global white main');
   assert(parseFloat(getComputedStyle(document.querySelector('.kd-ops-heading p')).fontSize)>=14,'Readable subtitle');
   const period=document.querySelector('#kd-dashboard-period');
   period.value='7';period.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>document.querySelector('.kd-ops-kpis article:nth-child(2)>strong')?.textContent==='7','7-day overview');
   await click('Confirm new orders');await until(ready,'filtered orders');
   assert(route()==='/admin/orders?status=PENDING','Priority opens persistent filtered order URL');
   assert(calls.some(path=>path==='/admin/reports/orders?status=PENDING'),'Server receives status filter');
   await click('View order');await until(()=>document.querySelector('.kd-order-card'),'order details');
   assert(route()==='/admin/orders?id=901','Exact order URL');
   assert(!document.querySelector('.kd-order-management-toolbar'),'Detail view omits redundant filters');
   await click('Browser back');await until(ready,'browser back to queue');
   assert(route()==='/admin/orders?status=PENDING','Browser back restores queue filter');
   await follow('.kd-ops-back');await until(()=>document.querySelector('.kd-ops-kpis'),'return overview');
   assert(document.querySelector('#kd-dashboard-period').value==='7','Overview period retained');
   await follow('[aria-label="Open stock watchlist"]');await until(ready,'inventory');
   assert(route()==='/admin/inventory','Separate stock page');
   assert(document.documentElement.scrollWidth<=window.innerWidth+2,'Report fits viewport');
   if(window.innerWidth<800)assert(document.querySelector('.kd-ops-scroll').scrollWidth>document.querySelector('.kd-ops-scroll').clientWidth,'Mobile table scrolls inside its region');
   await choose('Stock level','all');await until(()=>ready()&&route().includes('filter=all'),'stock filter');
   await click('Next');await until(()=>ready()&&route().includes('page=2'),'pagination');
   await input(document.querySelector('.kd-report-search input'),'Jacket');
   await until(()=>ready()&&route().includes('search=Jacket')&&!route().includes('page='),'debounced search resets page');
   const inventoryUrl=route();
   await click('Edit stock');await until(()=>document.querySelector('[role="dialog"]'),'stock editor');
   assert(route()==='/admin/products?id=901','Product deep link');
   const name=document.querySelector('input[placeholder="Classic Overshirt"]');
   await input(name,'Unsaved Jacket');
   await click('Refresh data');await wait();
   assert(document.querySelector('input[placeholder="Classic Overshirt"]').value==='Unsaved Jacket','Background refresh retains unsaved editor fields');
   await follow('[aria-label="Close product editor"]');await until(ready,'return from editor');
   assert(route()===inventoryUrl,'Closing editor returns to filtered stock list');
   await input(document.querySelector('.kd-report-search input'),'no-match');
   await until(()=>document.querySelector('.kd-ops-empty h2')?.textContent==='No matching records','empty result');
   await click('Reset filters');await until(ready,'reset');
   reportFailure=true;await click('Refresh data');
   await until(()=>button('Try again'),'report error');
   assert(!ready(),'Failed report hides stale rows');
   await click('Try again');await until(ready,'report retry');
   await follow('.kd-ops-back');await until(()=>document.querySelector('.kd-ops-kpis'),'overview again');
   await follow('[aria-label="Open best-selling products"]');await until(ready,'ranking');
   assert(route()==='/admin/best-sellers?days=7','Ranking inherits reporting period');
   assert(document.querySelector('.kd-report-table').textContent.includes('Paid value'),'Ranking separates paid and order values');
   await follow('.kd-ops-back');await until(()=>document.querySelector('.kd-ops-kpis'),'overview before catalog');
   await follow('[aria-label="Open catalog health"]');await until(ready,'catalog');
   await choose('Catalog filter','missing_cover');await until(()=>ready()&&route().includes('filter=missing_cover'),'catalog filter');
   const reloadUrl=route();mount(reloadUrl,'reload');
   await until(()=>ready()&&route()===reloadUrl,'direct report load');
   assert(document.querySelector('.kd-report-toolbar select').value==='missing_cover','Direct URL restores filter');
   await follow('.kd-ops-sidebar nav a[href="/admin"]');await until(()=>document.querySelector('.kd-ops-kpis'),'overview after reload');
   const select=document.querySelector('#kd-dashboard-period');select.value='90';select.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>button('Try again'),'overview error');
   assert(!document.querySelector('.kd-ops-kpis'),'No fabricated metrics on API failure');
   await click('Try again');await until(()=>document.querySelector('.kd-ops-kpis article:nth-child(2)>strong')?.textContent==='90','overview retry');
   const output=document.createElement('output');output.textContent='DASHBOARD_CHECKS_PASSED';document.body.append(output);
  }catch(error){const output=document.createElement('output');output.textContent='DASHBOARD_CHECKS_FAILED: '+error.message;document.body.append(output);}
 })();
}
