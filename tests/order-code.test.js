import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOrderCode,publicOrderCode} from '../server/src/orderCode.js';
test('KD order code includes Vietnam calendar date and 12 hex characters',()=>{
 const date=new Date('2026-10-19T18:00:00Z');
 assert.equal(makeOrderCode(date,()=>Buffer.from('aabbccddeeff','hex')),'KD-20261020-AABBCCDDEEFF');
 assert.match(makeOrderCode(new Date('2026-10-20T02:00:00Z')),/^KD-\d{8}-[A-F0-9]{12}$/);
});
test('older orders have a safe display fallback',()=>{
 assert.equal(publicOrderCode({id:12}), 'KD-00000012');
 assert.equal(publicOrderCode({id:12,order_code:'KD-20261020-ABCDEF012345'}),'KD-20261020-ABCDEF012345');
});
