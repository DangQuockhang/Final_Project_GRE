import test from 'node:test';
import assert from 'node:assert/strict';
import {membershipSummary} from '../server/src/membership.js';
import {orderAction,actionReason} from '../server/src/orderLifecycle.js';
const tiers=[['bronze','Đồng',0],['silver','Bạc',2000000],['gold','Vàng',5000000],['diamond','Kim cương',15000000],['platinum','Platinum',30000000]].map(([code,name,min_spend],i)=>({code,name,min_spend:String(min_spend),rank:i+1,benefits:[]}));
test('membership uses configured thresholds at every boundary and caps maximum tier progress',()=>{
 for(const [spend,code] of [[0,'bronze'],[1999999,'bronze'],[2000000,'silver'],[4999999,'silver'],[5000000,'gold'],[15000000,'diamond'],[30000000,'platinum'],[90000000,'platinum']])assert.equal(membershipSummary(tiers,spend).current.code,code);
 assert.equal(membershipSummary(tiers,3500000).progress,50);
 assert.equal(membershipSummary(tiers,30000000).remaining,0);
 assert.equal(membershipSummary(tiers,30000000).next,null);
 const configured=tiers.map(t=>({...t,min_spend:Number(t.min_spend)*2}));
 assert.equal(membershipSummary(configured,2500000).current.code,'bronze');
});
test('invalid membership configuration fails visibly instead of assigning a wrong tier',()=>{
 for(const rows of [[],tiers.slice(1),tiers.map(t=>({...t,min_spend:0})),tiers.map(t=>({...t,benefits:[{}]}))])assert.throws(()=>membershipSummary(rows,0),e=>e.status===503);
 assert.throws(()=>membershipSummary(tiers,Number.MAX_SAFE_INTEGER+1));
 assert.throws(()=>membershipSummary(tiers,-1));
});
const cash={status:'DELIVERED',payment_status:'UNPAID',payment_method:'COD'};
const reason='Đã kiểm tra tiền và biên nhận.';
test('COD is never assumed paid from delivery alone; explicit receipt requires a delivered order',()=>{
 assert.equal(orderAction({...cash,status:'SHIPPED'},'STATUS',{status:'DELIVERED'}).payment_status,'UNPAID');
 assert.throws(()=>orderAction({...cash,status:'SHIPPED'},'PAYMENT',{status:'PAID',reason}),e=>e.status===409);
 assert.equal(orderAction(cash,'PAYMENT',{status:'PAID',reason}).payment_status,'PAID');
 assert.throws(()=>orderAction(cash,'PAYMENT',{status:'PAID'}),e=>e.status===400);
});
test('cancelled bank transfers cannot be marked paid; repeats cannot change inventory or money twice',()=>{
 const bank={status:'CANCELLED',payment_status:'AWAITING_TRANSFER',payment_method:'BANK_TRANSFER'};
 assert.throws(()=>orderAction(bank,'PAYMENT',{status:'PAID'}),e=>e.status===409);
 assert.throws(()=>orderAction({...cash,payment_status:'PAID'},'PAYMENT',{status:'PAID',reason}),e=>e.status===409);
 assert.throws(()=>orderAction({...cash,status:'RETURNED'},'RETURN',{reason,confirmed:true,restock:true}),e=>e.status===409);
});
test('returns require a full-order confirmation and explicit restock choice; refunds are a separate action',()=>{
 const paid={...cash,payment_status:'PAID'};
 const returned=orderAction(paid,'RETURN',{reason,confirmed:true,restock:false});
 assert.equal(returned.status,'RETURNED');assert.equal(returned.payment_status,'REFUND_PENDING');assert.equal(returned.restocked,false);
 assert.throws(()=>orderAction(paid,'RETURN',{reason,confirmed:true}),e=>e.status===400);
 assert.throws(()=>orderAction(paid,'RETURN',{reason,confirmed:false,restock:true}),e=>e.status===400);
 assert.equal(orderAction({...paid,...returned},'REFUND',{reason,reference:'REF-01',confirmed:true}).payment_status,'REFUNDED');
 assert.throws(()=>orderAction(paid,'REFUND',{reason,reference:'REF-01',confirmed:true}),e=>e.status===409);
 for(const value of ['',{},'x'.repeat(501),'abc\ninvalid'])assert.throws(()=>actionReason(value));
});
