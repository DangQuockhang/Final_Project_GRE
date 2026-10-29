import React,{useState} from 'react';
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
import ProductsPanel from '../apps/store/src/pages/admin/ProductsPanel.jsx';
const product={id:901,slug:'test-jacket',name:'Test Jacket',brand_id:1,category:'clothing',price:100000,sale_price:null,status:'active',variants:[{id:1,sku:'ORIGINAL-M',size:'M',color:'Black',stock:2,color_hex:'#222222'}],images:[]};
const empty={...product,id:902,slug:'empty-cap',name:'Empty Cap',category:'accessories',variants:[]};
const products=[product,empty],brands=[{id:1,name:'Test Brand'}];
const saved=[];let failOnce=true;
const assert=(value,message)=>{if(!value)throw Error(message);};
async function api(path,{method,body}={}){
 assert(path==='/admin/products/bundle'&&method==='POST','A duplicate must create a new product');
 if(failOnce){failOnce=false;throw Error('SKU đã tồn tại. Vui lòng đổi SKU.');}
 const payload=JSON.parse(body.get('payload'));
 assert(payload.status==='draft'&&payload.variants.every(row=>row.id==null&&row.stock===0),'Copies have new identifiers and zero inventory');
 assert(!saved.some(old=>old.slug===payload.slug),'Copied slugs stay unique');
 assert(!payload.variants.some(row=>saved.some(old=>old.variants.some(existing=>existing.sku===row.sku))),'Generated SKU collided with an earlier copy');
 saved.push(payload);
 return {id:1000+saved.length,slug:payload.slug,created:true};
}
function Harness(){
 const [busy,setBusy]=useState(false);
 async function perform(action){setBusy(true);try{await action();return true;}catch{return false;}finally{setBusy(false);}}
 return <ProductsPanel products={products} brands={brands} collections={[]} api={api} perform={perform} busy={busy} report={()=>{}}/>;
}
if(import.meta.env.DEV){
 createRoot(document.getElementById('root')).render(<MemoryRouter><Harness/></MemoryRouter>);
 const wait=()=>new Promise(resolve=>setTimeout(resolve,80));
 const until=async(fn,label)=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error('Timed out: '+label);};
 const dialog=()=>document.querySelector('[role=dialog]');
 const click=async text=>{const node=[...dialog().querySelectorAll('button')].find(el=>el.textContent.trim()===text);assert(node,'Missing button '+text);node.click();await wait();};
 async function open(name){document.querySelector('[aria-label="Duplicate '+name+'"]').click();await until(dialog,'open duplicate');}
 async function addSize(){
  const field=[...dialog().querySelectorAll('label')].find(el=>el.textContent.includes('SIZE OPTIONS')).querySelector('input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,'M, L');
  field.dispatchEvent(new Event('input',{bubbles:true}));await wait();
  await click('GENERATE SIZE / STOCK');
 }
 (async()=>{
  try{
   await until(()=>document.querySelector('[aria-label="Duplicate Test Jacket"]'),'product card');
   for(let i=0;i<2;i++){
    await open('Test Jacket');await addSize();await click('SAVE');
    if(i===0){
     await until(()=>dialog()?.querySelector('[role=alert]'),'inline save error');
     assert(dialog().querySelector('[role=alert]').textContent.includes('SKU đã tồn tại'),'Error is visible inside the editing dialog');
     assert(dialog().querySelectorAll('.kd-quick-sku-row').length===2,'Failed save preserves changes');
     await click('SAVE');
    }
    await until(()=>!dialog(),'save duplicate');
   }
   for(let i=0;i<2;i++){await open('Empty Cap');await click('SAVE');await until(()=>!dialog(),'automatic SKU save');}
   assert(saved.length===4,'All copies are created');
   assert(saved[0].variants.some(row=>row.size==='L'),'Added size is saved');
   assert(saved.slice(2).every(copy=>copy.variants.length===1&&copy.variants[0].size==='ONE SIZE'),'No-size accessories get an automatic SKU');
   assert(product.variants[0].stock===2&&product.variants[0].sku==='ORIGINAL-M','Source inventory is untouched');
   const output=document.createElement('output');output.textContent='DUPLICATE_CHECKS_PASSED';document.body.append(output);
  }catch(error){const output=document.createElement('output');output.textContent='DUPLICATE_CHECKS_FAILED: '+error.message;document.body.append(output);}
 })();
}
