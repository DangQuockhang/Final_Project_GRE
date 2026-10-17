import test from 'node:test';
import assert from 'node:assert/strict';
import {filterProducts,paginateProducts} from '../packages/catalog/filters.js';
const brands=[{id:1,slug:'kd',name:'KD'}];
const items=[
 {id:1,name:'Jacket',brand_id:1,brand_name:'KD',category:'outerwear',product_type:'Jacket',price:2000000,sale_price:1600000,status:'active',variants:[{size:'M',stock:2}]},
 {id:2,name:'T-Shirt',brand_id:1,brand_name:'KD',category:'tops',product_type:'T-Shirt',price:1200000,sale_price:null,status:'active',variants:[{size:'S',stock:0}]},
 {id:3,name:'Archived',brand_id:1,brand_name:'KD',category:'tops',product_type:'T-Shirt',price:500000,status:'archived',variants:[{size:'S',stock:5}]}
];
test('retail filters use effective sale price',()=>{
 assert.deepEqual(filterProducts(items,brands,{sale:'1'}).map(p=>p.id),[1]);
 assert.deepEqual(filterProducts(items,brands,{price:'mid'}).map(p=>p.id),[1]);
 assert.deepEqual(filterProducts(items,brands,{price:'over2500'}),[]);
});
test('sold out, type, brand and size are respected',()=>{
 assert.deepEqual(filterProducts(items,brands,{stock:'soldout'}).map(p=>p.id),[2]);
 assert.deepEqual(filterProducts(items,brands,{type:'Jacket',stock:'available'}).map(p=>p.id),[1]);
 assert.deepEqual(filterProducts(items,brands,{brand:'nonexistent'}),[]);
 assert.deepEqual(filterProducts(items,brands,{size:'S',stock:'available'}),[]);
});
test('price sorting uses effective price and pages are stable',()=>{
 assert.deepEqual(filterProducts(items,brands,{sort:'high'}).map(p=>p.id),[1,2]);
 assert.deepEqual(paginateProducts(items,1,2).items.map(p=>p.id),[1,2]);
});
