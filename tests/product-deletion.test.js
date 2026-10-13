import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateProductDeletion} from '../server/src/productDeletion.js';
test('active product must be archived',()=>assert.equal(evaluateProductDeletion({status:'active',stock:0,orderItems:0}).eligible,false));
test('nonzero inventory blocks deletion',()=>assert.match(evaluateProductDeletion({status:'archived',stock:3,orderItems:0}).reason,/stock/i));
test('cancelled order history still blocks deletion',()=>assert.match(evaluateProductDeletion({status:'draft',stock:0,orderItems:1}).reason,/history/i));
test('empty draft or archived item may be deleted',()=>{
 assert.equal(evaluateProductDeletion({status:'draft',stock:0,orderItems:0}).eligible,true);
 assert.equal(evaluateProductDeletion({status:'archived',stock:0,orderItems:0}).eligible,true);
});
