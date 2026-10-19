import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVariantMatrix,hasMultipleColors,INTERNAL_COLOR} from '../apps/store/src/utils/variantBuilder.js';

test('single-color sandals can save without entering a color or generating SKUs',()=>{
 const result=buildVariantMatrix({name:'Simple Sandals',sizes:'ONE SIZE',rows:[],colors:[],defaultStock:'4',multipleColors:false});
 assert.equal(result.length,1);
 assert.deepEqual({size:result[0].size,color:result[0].color,stock:result[0].stock,color_hex:result[0].color_hex},
 {size:'ONE SIZE',color:INTERNAL_COLOR,stock:'4',color_hex:null});
 assert.match(result[0].sku,/simple-sandals-standard-one-size/);
 assert.equal(hasMultipleColors(result),false);
});

test('single-color products may have many sizes without a color selector',()=>{
 const result=buildVariantMatrix({name:'Slip-On',sizes:'39, 40, 41',colors:[],rows:[],defaultStock:2,multipleColors:false});
 assert.deepEqual(result.map(v=>v.size),['39','40','41']);
 assert.deepEqual([...new Set(result.map(v=>v.color))],[INTERNAL_COLOR]);
});

test('single existing color retains id, stock and SKU when editing',()=>{
 const old={id:12,sku:'OLD-BROWN-M',size:'M',color:'Brown',color_hex:'#6b4930',stock:'8'};
 const result=buildVariantMatrix({name:'Cap',sizes:'M',rows:[old],colors:[],defaultStock:0,multipleColors:false});
 assert.deepEqual(result,[old]);
});

test('multiple colors create distinct size and stock combinations',()=>{
 const result=buildVariantMatrix({name:'Fashion Shirt',sizes:'S, M',colors:[{name:'Black',hex:'#222222'},{name:'Red',hex:'#c33c42'}],rows:[],defaultStock:3,multipleColors:true});
 assert.equal(result.length,4);
 assert.equal(hasMultipleColors(result),true);
 assert.equal(result.filter(v=>v.color==='Red').length,2);
 assert.equal(result[3].color_hex,'#c33c42');
});

test('no silent loss of existing multicolor SKUs when disabling color options',()=>{
 assert.throws(()=>buildVariantMatrix({name:'A',sizes:'ONE SIZE',rows:[
  {id:1,sku:'A',size:'ONE SIZE',color:'Black',stock:0},
  {id:2,sku:'B',size:'ONE SIZE',color:'Red',stock:0}
 ],multipleColors:false}),/Remove unwanted color variants/);
});

test('rejects invalid size, stock and duplicate color labels',()=>{
 assert.throws(()=>buildVariantMatrix({name:'A',sizes:'',defaultStock:3}),/valid sizes/);
 assert.throws(()=>buildVariantMatrix({name:'A',sizes:'M',defaultStock:-1}),/non-negative/);
 assert.throws(()=>buildVariantMatrix({name:'A',sizes:'M',multipleColors:true,colors:[
  {name:'Black',hex:'#111111'},{name:'black',hex:'#222222'}
 ]}),/unique/);
});
