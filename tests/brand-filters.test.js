import test from 'node:test';
import assert from 'node:assert/strict';
import {brandProductCounts,filterSortBrands} from '../apps/store/src/utils/brandFilters.js';

const brands=[
 {id:10,name:'MLB',slug:'mlb',description:'Baseball caps',logo_url:'/media/products/mlb.png',created_at:'2026-09-01T00:00:00Z'},
 {id:20,name:'Áo Việt',slug:'ao-viet',description:'Vietnamese fashion',logo_url:null,created_at:'2026-10-18T00:00:00Z'},
 {id:30,name:'AMI',slug:'ami',description:'Parisian clothing',logo_url:'/media/products/ami.png',created_at:'2026-10-15T00:00:00Z'},
 {id:40,name:'Blank Brand',slug:'blank-brand',description:'',logo_url:'',created_at:'2026-08-01T00:00:00Z'}
];
const products=[
 {id:1,brand_id:10,status:'active'},
 {id:2,brand_id:10,status:'draft'},
 {id:3,brand_id:30,status:'active'},
 {id:4,brand_id:30,status:'active'},
 {id:5,brand_id:30,status:'archived'},
 {id:6,brand_id:20,status:'draft'}
];
const names=filter=>filterSortBrands(brands,products,filter).brands.map(b=>b.name);
test('search ignores accents and case, matching name, slug and description',()=>{
 assert.deepEqual(names({query:'áo'}),['Áo Việt']);
 assert.deepEqual(names({query:'AO VIET'}),['Áo Việt']);
 assert.deepEqual(names({query:'caps'}),['MLB']);
 assert.deepEqual(names({query:'parisian'}),['AMI']);
 assert.deepEqual(names({query:'unknown'}),[]);
});
test('sort names A-Z/Z-A and keep input order/data untouched',()=>{
 const original=brands.map(b=>b.id);
 assert.deepEqual(names({sort:'name-asc'}),['AMI','Áo Việt','Blank Brand','MLB']);
 assert.deepEqual(names({sort:'name-desc'}),['MLB','Blank Brand','Áo Việt','AMI']);
 assert.deepEqual(brands.map(b=>b.id),original);
});
test('sort by newly created, oldest, product counts with deterministic tie breaks',()=>{
 assert.deepEqual(names({sort:'newest'}),['Áo Việt','AMI','MLB','Blank Brand']);
 assert.deepEqual(names({sort:'oldest'}),['Blank Brand','MLB','AMI','Áo Việt']);
 assert.deepEqual(names({sort:'products-desc'}),['AMI','MLB','Áo Việt','Blank Brand']);
 assert.deepEqual(names({sort:'products-asc'}),['Blank Brand','Áo Việt','MLB','AMI']);
});
test('filter brands by with/without image or products',()=>{
 assert.deepEqual(names({logo:'with'}),['AMI','MLB']);
 assert.deepEqual(names({logo:'without'}),['Áo Việt','Blank Brand']);
 assert.deepEqual(names({productsFilter:'with'}),['AMI','Áo Việt','MLB']);
 assert.deepEqual(names({productsFilter:'without'}),['Blank Brand']);
 assert.deepEqual(names({query:'parisian',logo:'with',productsFilter:'with'}),['AMI']);
});
test('public directory counts only active products and does not show draft-only brands as active',()=>{
 const counts=brandProductCounts(products,{activeOnly:true});
 assert.equal(counts.get('10'),1);
 assert.equal(counts.get('30'),2);
 assert.equal(counts.get('20'),undefined);
 const present=filterSortBrands(brands,products,{activeOnly:true,productsFilter:'with'}).brands;
 assert.deepEqual(present.map(b=>b.name),['AMI','MLB']);
 assert.deepEqual(filterSortBrands(brands,products,{activeOnly:true,productsFilter:'without'}).brands.map(b=>b.name),['Áo Việt','Blank Brand']);
});
test('empty results and null catalog values do not throw',()=>{
 assert.deepEqual(filterSortBrands([],[],{}).brands,[]);
 assert.deepEqual(filterSortBrands(null,null,{query:'hi'}).brands,[]);
 assert.deepEqual(filterSortBrands(brands,[],{sort:'unknown'}).brands.map(b=>b.name),names({sort:'name-asc'}));
});
