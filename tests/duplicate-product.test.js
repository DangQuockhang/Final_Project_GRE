import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateProduct} from '../apps/store/src/utils/duplicateProduct.js';

const original={
 id:12,slug:'mlb-cap-04',name:'MLB CAP 04',brand_id:3,category:'accessories',
 product_type:'Cap',price:950000,sale_price:null,description:'Original description',
 status:'active',image_url:'/media/products/photo-1.png',images:[{image_url:'/media/products/photo-2.png'}],
 variants:[
  {id:50,sku:'MLB-CAP-BLACK',size:'ONE SIZE',color:'Black',color_hex:'#222222',stock:18},
  {id:51,sku:'MLB-CAP-RED',size:'ONE SIZE',color:'Red',color_hex:'#c33c42',stock:4}
 ]
};
test('duplicate is draft, retains merchandising details, resets stock and IDs',()=>{
 const clone=duplicateProduct(original,'abc123');
 assert.equal(clone.draft.name,'MLB CAP 04 (Copy)');
 assert.equal(clone.draft.status,'draft');
 assert.equal(clone.draft.brand_id,'3');
 assert.equal(clone.draft.category,'accessories');
 assert.equal(clone.draft.price,'950000');
 assert.equal(clone.draft.description,'Original description');
 assert.equal(clone.rows.length,2);
 assert.deepEqual(clone.rows.map(v=>v.stock),['0','0']);
 assert.deepEqual(clone.rows.map(v=>[v.size,v.color]),[['ONE SIZE','Black'],['ONE SIZE','Red']]);
 assert.ok(clone.rows.every(row=>!Object.hasOwn(row,'id')));
 assert.ok(clone.rows.every(row=>row.sku!==original.variants[0].sku&&row.sku!==original.variants[1].sku));
 assert.equal(original.variants[0].stock,18,'source inventory must not change');
 assert.equal(original.status,'active');
 assert.equal(clone.draft.image_url,undefined,'never copy references to product photo');
 assert.equal(clone.draft.images,undefined);
});
test('duplicate SKU and URL slug are unique per duplication token',()=>{
 const a=duplicateProduct(original,'abc123'),b=duplicateProduct(original,'abc456');
 assert.notEqual(a.rows[0].sku,b.rows[0].sku);
 assert.notEqual(a.getSlug(a.draft.name),b.getSlug(b.draft.name));
 assert.equal(a.getSlug('Another Name'),'another-name-copy-abc123');
});
test('single-color product may duplicate without color choices',()=>{
 const source={...original,variants:[original.variants[0]]};
 const clone=duplicateProduct(source,'abcdef');
 assert.equal(clone.rows.length,1);
 assert.equal(clone.rows[0].stock,'0');
 assert.equal(clone.sizes,'ONE SIZE');
});
test('duplicate validation rejects missing source ID and unsafe token',()=>{
 assert.throws(()=>duplicateProduct({},'abcdef'),/Invalid duplicate/);
 assert.throws(()=>duplicateProduct(original,'abc/!'),/Invalid duplicate/);
});
