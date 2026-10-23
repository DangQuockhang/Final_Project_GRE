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

  // Product types create normalized, category-scoped collections automatically.
  const makeTyped=(name,product_type,category='accessories',status='active')=>request('/api/products',{
   name:name+' '+id,brand_id:brands[0].id,category,product_type,price:100000,status
  },token);
  const typed=await makeTyped('Collection charm','  CHARM  ');
  assert.equal(typed.status,201);
  assert.equal(typed.data.product_type,'Charm');
  assert.ok(typed.data.collection_id);
  const [mixedA,mixedB]=await Promise.all([
   makeTyped('Collection mixed a','cHaRm'),makeTyped('Collection mixed b','CHARM')
  ]);
  assert.equal(mixedA.status,201);assert.equal(mixedB.status,201);
  assert.equal(mixedA.data.collection_id,typed.data.collection_id);
  assert.equal(mixedB.data.collection_id,typed.data.collection_id);
  const colId=typed.data.collection_id,colPath='/api/admin/collections/'+colId;
  let publicCollections=await fetch(base+'/api/collections').then(r=>r.json());
  assert.equal(publicCollections.find(c=>c.id===colId).active_count,3);
  assert.equal((await request('/api/admin/collections',undefined,user.data.token,'GET')).status,403);
  assert.equal((await request(colPath,{hidden:true},user.data.token,'PATCH')).status,403);
  assert.equal((await request(colPath,undefined,user.data.token,'DELETE')).status,403);
  assert.equal((await request(colPath,undefined,token,'DELETE')).status,409);
  assert.equal((await request(colPath,{hidden:true},token,'PATCH')).status,200);
  assert.ok(!(await fetch(base+'/api/collections').then(r=>r.json())).some(c=>c.id===colId));
  await request('/api/products/'+typed.data.id,{product_type:'CHarm'},token,'PATCH');
  assert.ok(!(await fetch(base+'/api/collections').then(r=>r.json())).some(c=>c.id===colId),'Saving a product must not unhide its collection');
  assert.equal((await request(colPath,{hidden:false},token,'PATCH')).status,200);
  for(const p of [typed,mixedA,mixedB])await request('/api/products/'+p.data.id,{status:'draft'},token,'PATCH');
  assert.ok(!(await fetch(base+'/api/collections').then(r=>r.json())).some(c=>c.id===colId),'Collections without active products are automatically omitted');
  assert.equal((await request(colPath,undefined,token,'DELETE')).status,409,'Draft products still protect the collection');
  for(const p of [typed,mixedA,mixedB])await request('/api/products/'+p.data.id,{product_type:''},token,'PATCH');
  assert.equal((await request(colPath,undefined,token,'DELETE')).status,200);
  assert.ok(!(await request('/api/admin/collections',undefined,token,'GET')).data.some(c=>c.id===colId));
  const shirt=await makeTyped('Collection shirt','SHirt','clothing');
  const sameShirt=await makeTyped('Collection same shirt','shirt','clothing');
  assert.equal(shirt.data.product_type,'Shirt');
  assert.equal(shirt.data.collection_id,sameShirt.data.collection_id);
  const changedCategory=await request('/api/products/'+sameShirt.data.id,{category:'accessories'},token,'PATCH');
  assert.equal(changedCategory.status,200);
  assert.notEqual(changedCategory.data.collection_id,shirt.data.collection_id);
  const movedBack=await request('/api/products/'+sameShirt.data.id,{category:'clothing'},token,'PATCH');
  assert.equal(movedBack.data.collection_id,shirt.data.collection_id);

  // A size-free accessory still has stock-backed SKUs and can be checked out.
  const accessoryPayload={name:'Size-free accessory '+id,brand_id:brands[0].id,category:'accessories',
   price:250000,status:'active',variants:[{sku:'NOSIZE-'+id,color:'Standard',stock:4,size:'  '}]};
  const submitAccessory=async(payload,productId)=>{
   const form=new FormData();form.append('payload',JSON.stringify(payload));
   return fetch(base+'/api/admin/products/'+(productId?productId+'/bundle':'bundle'),{
    method:productId?'PATCH':'POST',headers:{Authorization:'Bearer '+token},body:form
   });
  };
  const accessoryResponse=await submitAccessory(accessoryPayload);
  assert.equal(accessoryResponse.status,201);
  const accessoryInfo=await accessoryResponse.json();
  let accessory=await fetch(base+'/api/products/'+accessoryInfo.slug).then(r=>r.json());
  assert.equal(accessory.variants.length,1);
  assert.equal(accessory.variants[0].size,'ONE SIZE');
  assert.equal(accessory.variants[0].stock,4);
  const savedSku=accessory.variants[0].id;
  assert.equal((await submitAccessory({...accessoryPayload,variants:[{...accessory.variants[0],size:null,stock:5}]},accessoryInfo.id)).status,200);
  accessory=await fetch(base+'/api/products/'+accessoryInfo.slug).then(r=>r.json());
  assert.equal(accessory.variants[0].id,savedSku);
  assert.equal(accessory.variants[0].size,'ONE SIZE');
  const accessoryOrder=await request('/api/orders',{recipient:'Accessory Buyer',phone:'0000000000',
   address:'Test accessory checkout address',items:[{variant_id:savedSku,quantity:2}]},user.data.token);
  assert.equal(accessoryOrder.status,201);
  accessory=await fetch(base+'/api/products/'+accessoryInfo.slug).then(r=>r.json());
  assert.equal(accessory.variants[0].stock,3);
  for(const category of ['clothing','shoes']){
   assert.equal((await submitAccessory({...accessoryPayload,name:'Invalid size '+category+' '+id,category,
    variants:[{sku:'INVALID-'+category+'-'+id,color:'Standard',size:'',stock:2}]})).status,400);
  }
  // One-submit workflow and color variants: atomically persist product, photos and stock.
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6TuYAAAAASUVORK5CYII=','base64');
  const createBundle={
   name:'Bundle Color Tee '+id,brand_id:brands[0].id,category:'clothing',
   product_type:'T-Shirt',price:1300000,sale_price:900000,status:'active',description:'Three-color product',
   color:'#222222',cover_new_index:1,variants:[
    {sku:'B-'+id+'-BLACK-M',size:'M',color:'Black',color_hex:'#222222',stock:5},
    {sku:'B-'+id+'-RED-M',size:'M',color:'Red',color_hex:'#bb3344',stock:2},
    {sku:'B-'+id+'-GRAY-M',size:'M',color:'Gray',color_hex:'#888888',stock:0}
   ]
  };
  const bundleForm=body=>{
   const form=new FormData();form.append('payload',JSON.stringify(body));
   form.append('images',new Blob([png],{type:'image/png'}),'view1.png');
   form.append('images',new Blob([png],{type:'image/png'}),'view2.png');
   return form;
  };
  const denyBundle=await fetch(base+'/api/admin/products/bundle',{method:'POST',headers:{Authorization:'Bearer '+user.data.token},body:bundleForm(createBundle)});
  assert.equal(denyBundle.status,403);
  const bundle=await fetch(base+'/api/admin/products/bundle',{method:'POST',headers:{Authorization:'Bearer '+token},body:bundleForm(createBundle)});
  assert.equal(bundle.status,201); 
  const bundleBody=await bundle.json();
  const bundleItem=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());

  // A failed bundle must roll back its automatically-created collection too.
  const failedType='Rollback '+id;
  const failedForm=new FormData();
  failedForm.append('payload',JSON.stringify({...createBundle,name:'Failed collection '+id,
   product_type:failedType,cover_new_index:undefined,
   variants:[{...bundleItem.variants[0],id:undefined}]}));
  const failedBundle=await fetch(base+'/api/admin/products/bundle',{method:'POST',
   headers:{Authorization:'Bearer '+token},body:failedForm});
  assert.equal(failedBundle.status,409);
  const afterFailedCollections=await request('/api/admin/collections',undefined,token,'GET');
  assert.ok(!afterFailedCollections.data.some(c=>c.name===failedType));

  assert.equal(bundleItem.category,'clothing');
  assert.equal(bundleItem.images.length,2);
  assert.equal(bundleItem.image_url,bundleItem.images[1].image_url,'Chosen uploaded cover must be displayed to customers');
  // Size guide files must never pollute product photos. Products may override
  // their brand/category guide without changing their gallery image count.
  const chartForm=()=>{
   const form=new FormData();form.append('image',new Blob([png],{type:'image/png'}),'size-chart.png');return form;
  };
  const brandChartPath='/api/admin/brands/'+brands[0].id+'/size-guides/clothing';
  const deniedChart=await fetch(base+brandChartPath,{method:'POST',headers:{Authorization:'Bearer '+user.data.token},body:chartForm()});
  assert.equal(deniedChart.status,403);
  const brandChart=await fetch(base+brandChartPath,{method:'POST',headers:{Authorization:'Bearer '+token},body:chartForm()});
  assert.equal(brandChart.status,201);
  const brandChartBody=await brandChart.json();
  assert.match(brandChartBody.image_url,/^\/media\/products\/[a-f0-9-]{36}\.png$/i);
  const sizeWithDefault=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(sizeWithDefault.brand_size_guide_image_url,brandChartBody.image_url);
  assert.equal(sizeWithDefault.size_guide_image_url,null);
  assert.equal(sizeWithDefault.images.length,2,'Brand size chart is not a gallery photo');
  const productChartPath='/api/admin/products/'+bundleBody.id+'/size-guide';
  assert.equal((await fetch(base+productChartPath,{method:'POST',headers:{Authorization:'Bearer '+user.data.token},body:chartForm()})).status,403);
  const overrideChart=await fetch(base+productChartPath,{method:'POST',headers:{Authorization:'Bearer '+token},body:chartForm()});
  assert.equal(overrideChart.status,201);
  const overrideBody=await overrideChart.json();
  const sizeWithOverride=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(sizeWithOverride.size_guide_image_url,overrideBody.size_guide_image_url);
  assert.notEqual(sizeWithOverride.size_guide_image_url,sizeWithOverride.brand_size_guide_image_url);
  assert.equal(sizeWithOverride.images.length,2,'Product size guide is not a gallery photo');
  assert.equal((await request(productChartPath,undefined,token,'DELETE')).status,200);
  const restoredBrandGuide=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(restoredBrandGuide.size_guide_image_url,null);
  assert.equal(restoredBrandGuide.brand_size_guide_image_url,brandChartBody.image_url);
  assert.equal((await request(brandChartPath,undefined,token,'DELETE')).status,200);
  const noGuide=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(noGuide.brand_size_guide_image_url,null);
  // One-click Add Product creates product + gallery + size chart atomically.
  const withGuideProduct={
   ...createBundle,name:'One-step size chart '+id,status:'active',
   variants:createBundle.variants.map((v,i)=>({...v,sku:'ONESTEP-'+id+'-'+i}))
  };
  const makeGuideBundle=(body,chart)=>{
   const form=bundleForm(body);
   form.append('size_guide',new Blob([chart],{type:'image/png'}),'size-guide.png');
   return form;
  };
  const deniedWithChart=await fetch(base+'/api/admin/products/bundle',{
   method:'POST',headers:{Authorization:'Bearer '+user.data.token},
   body:makeGuideBundle(withGuideProduct,png)
  });
  assert.equal(deniedWithChart.status,403);
  const invalidChart=await fetch(base+'/api/admin/products/bundle',{
   method:'POST',headers:{Authorization:'Bearer '+token},
   body:makeGuideBundle(withGuideProduct,Buffer.from('not a PNG file'))
  });
  assert.equal(invalidChart.status,400,'Invalid size guide must reject whole product request');
  const noInvalidProduct=await fetch(base+'/api/products').then(r=>r.json());
  assert.ok(!noInvalidProduct.some(p=>p.name===withGuideProduct.name),'Rejected upload must not create partial product');
  const savedWithChart=await fetch(base+'/api/admin/products/bundle',{
   method:'POST',headers:{Authorization:'Bearer '+token},
   body:makeGuideBundle(withGuideProduct,png)
  });
  assert.equal(savedWithChart.status,201,'Create product and size guide in one request');
  const savedWithChartBody=await savedWithChart.json();
  const oneStepPdp=await fetch(base+'/api/products/'+savedWithChartBody.slug).then(r=>r.json());
  assert.match(oneStepPdp.size_guide_image_url,/^\/media\/products\/[a-f0-9-]{36}\.png$/i);
  assert.equal(oneStepPdp.images.length,2,'Size chart must not become a gallery slide');
  assert.equal(oneStepPdp.image_url,oneStepPdp.images[1].image_url);


  // Editing uses the same transaction for details, gallery, cover and size guide.
  const editAll=async(payload,{guide=false,photo=false}={})=>{
   const form=new FormData();form.append('payload',JSON.stringify(payload));
   if(photo)form.append('images',new Blob([png],{type:'image/png'}),'new-photo.png');
   if(guide)form.append('size_guide',new Blob([png],{type:'image/png'}),'replacement-chart.png');
   return fetch(base+'/api/admin/products/'+savedWithChartBody.id+'/bundle',{
    method:'PATCH',headers:{Authorization:'Bearer '+token},body:form
   });
  };
  const allPayload={...withGuideProduct,cover_new_index:undefined,variants:oneStepPdp.variants,
   description:'Saved together',image_ids:oneStepPdp.images.map(x=>x.id).reverse(),
   cover_image_id:oneStepPdp.images[0].id};
  assert.equal((await editAll(allPayload,{guide:true,photo:true})).status,200);
  const allSaved=await fetch(base+'/api/products/'+savedWithChartBody.slug).then(r=>r.json());
  assert.equal(allSaved.description,'Saved together');
  assert.deepEqual(allSaved.images.slice(0,2).map(x=>x.id),allPayload.image_ids);
  assert.equal(allSaved.images.length,3);
  assert.equal(allSaved.image_url,oneStepPdp.images[0].image_url);
  assert.notEqual(allSaved.size_guide_image_url,oneStepPdp.size_guide_image_url);
  const invalidEdit={...allPayload,description:'Must roll back',image_ids:allSaved.images.map(x=>x.id),cover_image_id:987654321};
  assert.equal((await editAll(invalidEdit,{guide:true,photo:true})).status,400);
  const unchanged=await fetch(base+'/api/products/'+savedWithChartBody.slug).then(r=>r.json());
  assert.equal(unchanged.description,allSaved.description);
  assert.equal(unchanged.size_guide_image_url,allSaved.size_guide_image_url);
  assert.equal(unchanged.images.length,3);
  const deleting=allSaved.images.find(x=>x.image_url===allSaved.image_url);
  const kept=allSaved.images.filter(x=>x.id!==deleting.id);
  assert.equal((await editAll({...allPayload,image_ids:kept.map(x=>x.id),
   deleted_image_ids:[deleting.id],cover_image_id:null,remove_size_guide:true})).status,200);
  const mediaRemoved=await fetch(base+'/api/products/'+savedWithChartBody.slug).then(r=>r.json());
  assert.equal(mediaRemoved.images.length,2);
  assert.equal(mediaRemoved.image_url,kept[0].image_url);
  assert.equal(mediaRemoved.size_guide_image_url,null);

  assert.equal(bundleItem.variants.length,3);
  assert.equal(bundleItem.variants.find(v=>v.color==='Red').color_hex,'#bb3344');
  assert.equal(bundleItem.variants.find(v=>v.color==='Gray').stock,0);
  const editedPayload={...createBundle,cover_new_index:undefined,name:'Bundle Color Tee '+id,price:1400000,sale_price:950000,
   variants:bundleItem.variants.map(v=>({...v,stock:v.color==='Red'?4:v.stock}))};
  const updateForm=new FormData();updateForm.append('payload',JSON.stringify(editedPayload));
  const updateBundle=await fetch(base+'/api/admin/products/'+bundleBody.id+'/bundle',{method:'PATCH',headers:{Authorization:'Bearer '+token},body:updateForm});
  assert.equal(updateBundle.status,200);
  const edited=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(Number(edited.sale_price),950000);
  assert.equal(edited.variants.find(v=>v.color==='Red').stock,4);
  // Deleting duplicate or unwanted color/size SKUs is staged in the Product Editor.
  // The server accepts explicit deletes in the same atomic edit, but never breaks order history.
  const orderLinked=edited.variants.find(v=>v.color==='Black');
  const disposable=edited.variants.find(v=>v.color==='Gray');
  const positive=edited.variants.find(v=>v.color==='Red');
  const orderOnBundle=await request('/api/orders',{
   recipient:'Test Customer',phone:'0000000000',address:'Inventory API integration test address',
   items:[{variant_id:orderLinked.id,quantity:1}]
  },user.data.token);
  assert.equal(orderOnBundle.status,201);
  assert.match(orderOnBundle.data.order_code,/^KD-\d{8}-[A-F0-9]{12}$/);
  assert.equal(orderOnBundle.data.payment_method,'COD');
  const methodList=await fetch(base+'/api/payment-methods').then(r=>r.json());
  assert.equal(methodList.cod,true);
  assert.equal(methodList.bank_transfer.enabled,true);
  const history=await request('/api/orders/mine',undefined,user.data.token,'GET');
  assert.equal(history.status,200);
  const orderedLine=history.data.find(o=>o.id===orderOnBundle.data.id).items[0];
  assert.ok(orderedLine.image_url?.startsWith('/media/products/'));
  assert.equal(orderedLine.product_name,edited.name);
  assert.equal(orderedLine.brand_name,brands[0].name);
  assert.equal(orderedLine.size,'M');
  assert.equal(orderedLine.slug,edited.slug);
  const transfer=await request('/api/orders',{
   recipient:'Test Customer',phone:'0000000000',address:'Bank transfer integration test address',
   payment_method:'BANK_TRANSFER',items:[{variant_id:orderLinked.id,quantity:1}]
  },user.data.token);
  assert.equal(transfer.status,201);
  assert.equal(transfer.data.payment_status,'AWAITING_TRANSFER');
  assert.match(transfer.data.order_code,/^KD-\d{8}-[A-F0-9]{12}$/);
  assert.notEqual(transfer.data.order_code,orderOnBundle.data.order_code);
  const unverified=await request('/api/admin/orders/'+transfer.data.id+'/status',{status:'CONFIRMED'},token,'PATCH');
  assert.equal(unverified.status,409,'Bank payment must be verified before order can be confirmed');
  const forbiddenVerify=await request('/api/admin/orders/'+transfer.data.id+'/payment',{status:'PAID'},user.data.token,'PATCH');
  assert.equal(forbiddenVerify.status,403);
  const verified=await request('/api/admin/orders/'+transfer.data.id+'/payment',{status:'PAID'},token,'PATCH');
  assert.equal(verified.status,200);
  assert.equal(verified.data.payment_status,'PAID');
  const confirmedTransfer=await request('/api/admin/orders/'+transfer.data.id+'/status',{status:'CONFIRMED'},token,'PATCH');
  assert.equal(confirmedTransfer.status,200);
  const cancelledPaid=await request('/api/admin/orders/'+transfer.data.id+'/status',{status:'CANCELLED'},token,'PATCH');
  assert.equal(cancelledPaid.status,200);
  assert.equal(cancelledPaid.data.payment_status,'REFUND_PENDING','Cancellation cannot imply funds refunded');
  const afterOrder=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  const submitDeletion=(current,ids,confirm=false)=> {
   const form=new FormData();
   form.append('payload',JSON.stringify({
    ...editedPayload,
    name:current.name,price:current.price,sale_price:current.sale_price,
    variants:current.variants.filter(v=>!ids.some(id=>String(id)===String(v.id))),
    deleted_variant_ids:ids,confirm_stock_discard:confirm
   }));
   return form;
  };
  const deniedVariantDeletion=await fetch(base+'/api/admin/products/'+bundleBody.id+'/bundle',{
   method:'PATCH',headers:{Authorization:'Bearer '+user.data.token},body:submitDeletion(afterOrder,[disposable.id])
  });
  assert.equal(deniedVariantDeletion.status,403);
  const orderDeletion=await fetch(base+'/api/admin/products/'+bundleBody.id+'/bundle',{
   method:'PATCH',headers:{Authorization:'Bearer '+token},
   body:submitDeletion(afterOrder,[orderLinked.id],true)
  });
  assert.equal(orderDeletion.status,409,'An order-linked SKU must not be deleted');
  const stillThere=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(stillThere.variants.length,3,'Failed deletion must roll back every change');
  const zeroStockDeletion=await fetch(base+'/api/admin/products/'+bundleBody.id+'/bundle',{
   method:'PATCH',headers:{Authorization:'Bearer '+token},body:submitDeletion(stillThere,[disposable.id])
  });
  assert.equal(zeroStockDeletion.status,200,'Unordered SKU with 0 stock can be removed');
  const withoutGray=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.equal(withoutGray.variants.length,2);
  assert.equal(withoutGray.variants.some(v=>v.id===disposable.id),false);
  const noConfirmation=await fetch(base+'/api/admin/products/'+bundleBody.id+'/bundle',{
   method:'PATCH',headers:{Authorization:'Bearer '+token},body:submitDeletion(withoutGray,[positive.id])
  });
  assert.equal(noConfirmation.status,409,'Stock-bearing SKU requires explicit confirmation');
  const confirmed=await fetch(base+'/api/admin/products/'+bundleBody.id+'/bundle',{
   method:'PATCH',headers:{Authorization:'Bearer '+token},body:submitDeletion(withoutGray,[positive.id],true)
  });
  assert.equal(confirmed.status,200);
  const finalBundle=await fetch(base+'/api/products/'+bundleBody.slug).then(r=>r.json());
  assert.deepEqual(finalBundle.variants.map(v=>v.id),[orderLinked.id]);
  const logoForm=()=>{const form=new FormData();form.append('image',new Blob([png],{type:'image/png'}),'brand.png');return form;};
  const deniedLogo=await fetch(base+'/api/admin/brands/'+brands[0].id+'/logo',{method:'POST',headers:{Authorization:'Bearer '+user.data.token},body:logoForm()});
  assert.equal(deniedLogo.status,403);
  const logoUpload=await fetch(base+'/api/admin/brands/'+brands[0].id+'/logo',{method:'POST',headers:{Authorization:'Bearer '+token},body:logoForm()});
  assert.equal(logoUpload.status,201);
  const savedBrands=await fetch(base+'/api/brands').then(r=>r.json());
  assert.ok(savedBrands.find(b=>b.id===brands[0].id).logo_url?.startsWith('/media/products/'));
  const logoRemoved=await request('/api/admin/brands/'+brands[0].id+'/logo',undefined,token,'DELETE');
  assert.equal(logoRemoved.status,200);

  const product=await request('/api/products',{
   name:'Test Tee '+id,brand_id:brands[0].id,category:'clothing',product_type:'T-Shirt',price:1200000,sale_price:990000,status:'active'
  },token);
  assert.equal(product.status,201);
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
  // Multi-image gallery requires Admin permissions and stores actual image bytes.
  const galleryForm=()=>{
   const data=new FormData();
   data.append('images',new Blob([png],{type:'image/png'}),'view-front.png');
   data.append('images',new Blob([png],{type:'image/png'}),'view-side.png');
   return data;
  };
  const galleryPath='/api/admin/products/'+product.data.id+'/images';
  const deniedGallery=await fetch(base+galleryPath,{method:'POST',headers:{Authorization:'Bearer '+user.data.token},body:galleryForm()});
  assert.equal(deniedGallery.status,403);
  const uploadedGallery=await fetch(base+galleryPath,{method:'POST',headers:{Authorization:'Bearer '+token},body:galleryForm()});
  assert.equal(uploadedGallery.status,201);
  const galleryData=await uploadedGallery.json();
  assert.equal(galleryData.images.length,2);
  const withGallery=await fetch(base+'/api/products/'+product.data.slug).then(r=>r.json());
  assert.equal(withGallery.images.length,2);
  const orderPath=galleryPath+'/order';
  const photoIds=galleryData.images.map(image=>image.id);
  assert.equal((await request(orderPath,{image_ids:photoIds.slice().reverse(),cover_image_id:photoIds[1]},user.data.token,'PATCH')).status,403,
   'Customers cannot reorder or change storefront product images');
  assert.equal((await request(orderPath,{image_ids:[photoIds[0]],cover_image_id:photoIds[1]},token,'PATCH')).status,409,
   'Partial lists must not remove/rearrange other gallery entries');
  assert.equal((await request(orderPath,{image_ids:photoIds,cover_image_id:987654321},token,'PATCH')).status,400,
   'Cover must belong to the selected product');
  const reordered=await request(orderPath,{image_ids:[photoIds[1],photoIds[0]],cover_image_id:photoIds[1]},token,'PATCH');
  assert.equal(reordered.status,200);
  const reorderedPdp=await fetch(base+'/api/products/'+product.data.slug).then(r=>r.json());
  assert.deepEqual(reorderedPdp.images.map(image=>String(image.id)),[photoIds[1],photoIds[0]].map(String),
   'Public gallery order must persist after refresh');
  assert.equal(reorderedPdp.image_url,galleryData.images[1].image_url,
   'Set-as-cover must update actual storefront product cover');
  assert.equal(withGallery.product_type,'T-shirt');
  assert.equal(Number(withGallery.sale_price),990000);
  const removedGallery=await request('/api/admin/products/'+product.data.id+'/images/'+galleryData.images[0].id,undefined,token,'DELETE');
  assert.equal(removedGallery.status,200);
  const afterRemoval=await fetch(base+'/api/products/'+product.data.slug).then(r=>r.json());
  assert.equal(afterRemoval.images.length,1);
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
  assert.equal(Number(order.data.total),1980000);
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
  // Removing the cover keeps an existing gallery photo as the new cover.
  assert.equal(unphotographed.image_url,galleryData.images[1].image_url);
  // User cannot preflight or permanently remove products.
  const deniedDelete=await request('/api/admin/products/'+product.data.id+'/permanent',undefined,user.data.token,'DELETE');
  assert.equal(deniedDelete.status,403);
  const deniedPreflight=await request('/api/admin/products/'+product.data.id+'/delete-check',undefined,user.data.token,'GET');
  assert.equal(deniedPreflight.status,403);
  // Active product is protected even if inventory is later zeroed.
  const activeCheck=await request('/api/admin/products/'+product.data.id+'/delete-check',undefined,token,'GET');
  assert.equal(activeCheck.status,200);
  assert.equal(activeCheck.data.eligible,false);
  assert.equal((await request('/api/admin/products/'+product.data.id+'/permanent',undefined,token,'DELETE')).status,409);
  // Cancelled orders are still history, so Archive is the correct action.
  assert.equal((await request('/api/products/'+product.data.id,{status:'archived'},token,'PATCH')).status,200);
  assert.equal((await request('/api/admin/products/'+product.data.id+'/permanent',undefined,token,'DELETE')).status,409);
  assert.equal((await request('/api/variants/'+variant.data.id,{stock:0},token,'PATCH')).status,200);
  const historicCheck=await request('/api/admin/products/'+product.data.id+'/delete-check',undefined,token,'GET');
  assert.equal(historicCheck.data.stock,0);
  assert.equal(historicCheck.data.orderItems,1);
  assert.equal(historicCheck.data.eligible,false);
  assert.equal((await request('/api/admin/products/'+product.data.id+'/permanent',undefined,token,'DELETE')).status,409);
  // Separate disposable draft: a stock/permission-protected deletion.
  const draft=await request('/api/products',{
   name:'Disposable Tee '+id,brand_id:brands[0].id,category:'clothing',price:800000,status:'draft'
  },token);
  assert.equal(draft.status,201);
  const draftSku=await request('/api/products/'+draft.data.id+'/variants',{
    sku:'TODELETE-'+id,size:'L',color:'Grey',stock:2
  },token);
  assert.equal(draftSku.status,201);
  assert.equal((await request('/api/admin/products/'+draft.data.id+'/permanent',undefined,token,'DELETE')).status,409);
  assert.equal((await request('/api/variants/'+draftSku.data.id,{stock:0},token,'PATCH')).status,200);
  const allowed=await request('/api/admin/products/'+draft.data.id+'/delete-check',undefined,token,'GET');
  assert.equal(allowed.status,200);
  assert.equal(allowed.data.eligible,true);
  const erased=await request('/api/admin/products/'+draft.data.id+'/permanent',undefined,token,'DELETE');
  assert.equal(erased.status,200);
  assert.equal(erased.data.method,'permanent-delete');
  assert.ok(erased.data.audit_id);
  const all=await request('/api/admin/products',undefined,token,'GET');
  assert.equal(all.status,200);
  assert.equal(all.data.some(p=>p.id===draft.data.id),false);
  assert.equal((await request('/api/admin/products/'+draft.data.id+'/permanent',undefined,token,'DELETE')).status,404);

 }finally{server.kill();}
});
