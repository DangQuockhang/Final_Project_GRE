import test from 'node:test';
import assert from 'node:assert/strict';
import {filterAdminProducts} from '../apps/store/src/utils/adminProductFilters.js';
const products=[
 {id:1,name:'ADLV T-SHIRT 121',brand_id:10,brand_name:'ACME DE LA VIE',slug:'adlv-shirt-121',status:'active'},
 {id:2,name:'ADLV T-SHIRT 119',brand_id:10,brand_name:'ACME DE LA VIE',slug:'adlv-shirt-119',status:'draft'},
 {id:3,name:'MLB SLIDES 01',brand_id:20,brand_name:'MLB',slug:'mlb-slides-01',status:'active'},
 {id:4,name:'PUMA SPEEDCAT',brand_id:30,brand_name:'PUMA',slug:'puma-speedcat',status:'archived'}
];
test('admin brand filtering uses IDs and works with numeric or string IDs',()=>{
 assert.deepEqual(filterAdminProducts(products,{brandId:'10'}).map(p=>p.id),[1,2]);
 assert.deepEqual(filterAdminProducts(products,{brandId:20}).map(p=>p.id),[3]);
 assert.equal(filterAdminProducts(products,{brandId:'999'}).length,0);
});
test('admin brand, status and search filters combine correctly',()=>{
 assert.deepEqual(filterAdminProducts(products,{brandId:'10',status:'draft'}).map(p=>p.id),[2]);
 assert.deepEqual(filterAdminProducts(products,{brandId:'10',status:'active',search:'119'}),[]);
 assert.deepEqual(filterAdminProducts(products,{brandId:'10',status:'active',search:'adlv'}).map(p=>p.id),[1]);
});
test('search matches name, slug or brand without accents and case',()=>{
 assert.deepEqual(filterAdminProducts(products,{search:'PUMA'}).map(p=>p.id),[4]);
 assert.deepEqual(filterAdminProducts(products,{search:'speedcat'}).map(p=>p.id),[4]);
 assert.deepEqual(filterAdminProducts(products,{search:'ACME DE LA VIE'}).map(p=>p.id),[1,2]);
 assert.deepEqual(filterAdminProducts([{name:'Áo Dài',brand_name:'Đẹp',slug:'ao-dai'}],{search:'ao dai'}).length,1);
});
test('All Brands reset and empty catalog preserve source array',()=>{
 const result=filterAdminProducts(products,{search:'',brandId:'all',status:'all'});
 assert.deepEqual(result,products);
 assert.notEqual(result,products);
 assert.deepEqual(filterAdminProducts([],{}),[]);
 assert.deepEqual(filterAdminProducts(null,{}),[]);
});
