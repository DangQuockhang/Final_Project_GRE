import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCartProduct,effectivePrice,displayVariantColor,cartDisplayTotal} from '../apps/store/src/utils/cartDisplay.js';

const old={id:42,slug:'puma-shoe',name:'PUMA Shoe',price:2900000,brand_name:'PUMA',variants:[{color:'Standard',size:'42'}]};
const newer={...old,image_url:'/media/products/11111111-1111-4111-8111-111111111111.jpg',sale_price:1990000,variants:[{color:'Standard',size:'42',stock:3}]};
const entry={key:'77',product:old,variant:{id:77,size:'42',color:'Standard'},quantity:2};
test('cart product uses latest server image and price when available',()=>{
 assert.equal(resolveCartProduct(entry,[newer]).image_url,newer.image_url);
 assert.equal(effectivePrice(newer),1990000);
 assert.equal(cartDisplayTotal([entry],[newer]),3980000);
});
test('cart retains product snapshot when catalog is offline',()=>{
 assert.equal(resolveCartProduct(entry,[]),old);
 assert.equal(cartDisplayTotal([entry],[]),5800000);
});
test('color is omitted for single-color products but shown for true variants',()=>{
 assert.equal(displayVariantColor(entry,newer),'');
 assert.equal(displayVariantColor({...entry,variant:{...entry.variant,color:'Red'}},
  {...newer,variants:[{color:'Black'},{color:'Red'}]}),'Red');
});
test('sale only applies when below original price',()=>{
 assert.equal(effectivePrice({...newer,sale_price:3500000}),2900000);
 assert.equal(effectivePrice({...newer,sale_price:null}),2900000);
});
