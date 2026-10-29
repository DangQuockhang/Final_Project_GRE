import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {duplicateProduct} from '../apps/store/src/utils/duplicateProduct.js';
import {buildVariantMatrix} from '../apps/store/src/utils/variantBuilder.js';
export async function checkProductDuplicates(base,token,brandId){
 const bundle=async payload=>{
  const form=new FormData();form.append('payload',JSON.stringify(payload));
  const response=await fetch(base+'/api/admin/products/bundle',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});
  return {status:response.status,data:await response.json()};
 };
 const get=async id=>(await fetch(base+'/api/admin/products?id='+id,{headers:{Authorization:'Bearer '+token}})).json();
 const tag=randomUUID().slice(0,8);
 const source=await bundle({name:'Duplicate regression '+tag,brand_id:brandId,category:'clothing',price:100000,status:'active',
  variants:[{sku:'SOURCE-'+tag,size:'M',color:'Black',stock:7,color_hex:'#222222'}]});
 assert.equal(source.status,201);
 const original=(await get(source.data.id))[0],copies=[];
 for(let i=0;i<2;i++){
  const copy=duplicateProduct(original,tag+'-'+i);
  const variants=buildVariantMatrix({name:copy.draft.name,category:'clothing',sizes:'M, L',rows:copy.rows,multipleColors:true,
   colors:[{name:'Black',hex:'#222222'},{name:'Red',hex:'#cc0000'}],skuPrefix:copy.skuPrefix});
  const created=await bundle({...copy.draft,slug:copy.getSlug(copy.draft.name),color:'#222222',variants});
  assert.equal(created.status,201,JSON.stringify(created.data));
  const saved=(await get(created.data.id))[0];
  assert.equal(saved.status,'draft');assert.equal(saved.variants.length,4);
  assert.ok(saved.variants.every(row=>row.stock===0&&row.id!==original.variants[0].id));
  copies.push(saved);
 }
 const allSkus=copies.flatMap(copy=>copy.variants.map(row=>row.sku));
 assert.equal(new Set(allSkus).size,allSkus.length);
 assert.notEqual(copies[0].slug,copies[1].slug);
 const after=(await get(original.id))[0];
 assert.deepEqual(after.variants,original.variants,'Duplicating never modifies source stock or variant IDs');
}
