import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';

const base='http://127.0.0.1:4000';
async function request(url,body,token,method='POST'){
 const response=await fetch(base+url,{
  method,
  headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined
 });
 return {status:response.status,data:await response.json()};
}
test('Admin permissions and COD stock transactions against disposable PostgreSQL',async()=>{
 assert.match(new URL(process.env.DATABASE_URL).pathname,/\/kd_test$/);
 const server=spawn(process.execPath,['src/index.js'],{cwd:resolve('server'),env:process.env,stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}
   await sleep(250);
  }
  assert.ok(ready,'API did not start');
  const admin=await request('/api/auth/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
  assert.equal(admin.status,200);
  const token=admin.data.token;
  const id=randomUUID().slice(0,8);
  const user=await request('/api/auth/register',{name:'Test Customer',email:'test-'+id+'@example.test',password:'TestCustomerPassword2026'});
  assert.equal(user.status,201);
  const brands=await fetch(base+'/api/brands').then(r=>r.json());
  const product=await request('/api/products',{
   name:'Test Tee '+id,brand_id:brands[0].id,category:'tops',price:1200000,status:'active'
  },token);
  assert.equal(product.status,201);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6TuYAAAAASUVORK5CYII=','base64');
  const makeForm=()=>{
    const form=new FormData();
    // Exercise a valid PNG whose filename/MIME declares JPEG, simulating misleading browser metadata.
    form.append('image',new Blob([png],{type:'image/jpeg'}),'ci-photo.jpg');
    return form;
  };
  const uploadPath='/api/admin/products/'+product.data.id+'/image';
  const deniedImage=await fetch(base+uploadPath,{
    method:'POST',headers:{Authorization:'Bearer '+user.data.token},body:makeForm()
  });
  assert.equal(deniedImage.status,403);
  const uploaded=await fetch(base+uploadPath,{
    method:'POST',headers:{Authorization:'Bearer '+token},body:makeForm()
  });
  assert.equal(uploaded.status,201);
  const image=await uploaded.json();
  assert.match(image.image_url,/^\/media\/products\/[a-f0-9-]{36}\.png$/);
  const download=await fetch(base+image.image_url);
  assert.equal(download.status,200);
  assert.match(download.headers.get('content-type'),/image\/png/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()),png);
  const photographed=await fetch(base+'/api/products/'+product.data.slug).then(r=>r.json());
  assert.equal(photographed.image_url,image.image_url);
  const variant=await request('/api/products/'+product.data.id+'/variants',{
   sku:'CI-'+id,size:'M',color:'Black',stock:5
  },token);
  assert.equal(variant.status,201);
  const forbidden=await request('/api/products',{name:'Not allowed'},user.data.token);
  assert.equal(forbidden.status,403);
  const order=await request('/api/orders',{
   recipient:'Test Customer',phone:'0000000000',address:'Demo Address for Tests',
   items:[{variant_id:variant.data.id,quantity:2}]
  },user.data.token);
  assert.equal(order.status,201);
  assert.equal(Number(order.data.total),2400000);
  const productUrl='/api/products/'+product.data.slug;
  const reduced=await fetch(base+productUrl).then(r=>r.json());
  assert.equal(reduced.variants[0].stock,3);
  const cancelled=await request('/api/admin/orders/'+order.data.id+'/status',{status:'CANCELLED'},token,'PATCH');
  assert.equal(cancelled.status,200);
  const restored=await fetch(base+productUrl).then(r=>r.json());
  assert.equal(restored.variants[0].stock,5);
  const cleared=await request('/api/admin/products/'+product.data.id+'/image',undefined,token,'DELETE');
  assert.equal(cleared.status,200);
  const unphotographed=await fetch(base+productUrl).then(r=>r.json());
  assert.equal(unphotographed.image_url,null);
 }finally{server.kill();}
});
