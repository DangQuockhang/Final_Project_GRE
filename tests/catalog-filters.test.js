import test from 'node:test';
import assert from 'node:assert/strict';
import {demoProducts,demoBrands,filterProducts,paginateProducts} from '../packages/catalog/index.js';
test('filter category, brand and text',()=>{
 assert.equal(filterProducts(demoProducts,demoBrands,{category:'accessories'}).length,2);
 assert.equal(filterProducts(demoProducts,demoBrands,{brand:'mono-object'}).length,2);
 assert.equal(filterProducts(demoProducts,demoBrands,{q:'SCULPT'}).length,1);
 assert.equal(filterProducts(demoProducts,demoBrands,{brand:'not-a-brand'}).length,0);
});
test('price, size and availability',()=>{
 assert.equal(filterProducts(demoProducts,demoBrands,{price:'under1500'}).length,2);
 assert.equal(filterProducts(demoProducts,demoBrands,{price:'over2500'}).length,1);
 assert.equal(filterProducts(demoProducts,demoBrands,{size:'M',stock:'available'}).length,3);
});
test('sorting does not mutate the source',()=>{
 const ids=demoProducts.map(p=>p.id);
 assert.equal(filterProducts(demoProducts,demoBrands,{sort:'low'})[0].slug,'everyday-cap');
 assert.deepEqual(demoProducts.map(p=>p.id),ids);
});
test('pagination stays inside bounds',()=>{
 assert.equal(paginateProducts(demoProducts,100,2).page,3);
 assert.equal(paginateProducts(demoProducts,0,2).page,1);
 assert.equal(paginateProducts(demoProducts,2,2).items.length,2);
});
