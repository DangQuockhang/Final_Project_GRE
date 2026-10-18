import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBrand,validateProduct,validateStock,validateVariant,adminMetrics,ORDER_TRANSITIONS} from '../apps/store/src/utils/adminValidation.js';

const product={name:'Modern jacket',brand_id:'1',category:'clothing',price:'1999000',color:'#aabbcc',status:'draft',description:''};
test('admin validates a brand before API request',()=>{
 assert.equal(validateBrand({name:'New Brand',description:'Contemporary'}),'');
 assert.match(validateBrand({name:'X'}),/2 đến 120/);
});
test('admin rejects malformed product pricing and status',()=>{
 assert.equal(validateProduct(product),'');
 assert.match(validateProduct({...product,price:'12.5'}),/số nguyên/);
 assert.match(validateProduct({...product,status:'published'}),/Trạng thái/);
 assert.ok(validateProduct({...product,category:'tops'}));
 assert.match(validateProduct({...product,brand_id:''}),/thương hiệu/);
});
test('SKU and stock are always non-negative integers',()=>{
 assert.equal(validateStock('0'),'');
 assert.ok(validateStock('-1'));
 assert.ok(validateStock('2.5'));
 assert.ok(validateStock(''));
 assert.equal(validateVariant({sku:'TEST-001',size:'M',color:'Onyx',stock:'3',chest_cm:'99'}),'');
 assert.match(validateVariant({sku:'',size:'M',color:'Onyx',stock:'3'}),/SKU/);
});
test('admin dashboard counts only appropriate order statuses',()=>{
 const stats=adminMetrics([{status:'active',variants:[{stock:2},{stock:0}]}],[{status:'PENDING',total:500},{status:'DELIVERED',total:1000}]);
 assert.deepEqual(stats,{active:1,lowStock:1,pending:1,deliveredValue:1000});
 assert.deepEqual(ORDER_TRANSITIONS.SHIPPED,['DELIVERED']);
});
