import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDelivery} from '../packages/catalog/delivery.js';
import {requireJwtSecret} from '../server/src/authConfig.js';
import {customerOrderFilter} from '../server/src/customerOrderRoutes.js';
test('delivery values normalize international phone numbers without changing an address snapshot',()=>{
 const checked=validateDelivery({recipient:'  Nguyễn An  ',phone:'+84 (912) 345-678',address:'12 Nguyễn Huệ\r\nPhường Bến Nghé, TP.HCM'});
 assert.equal(checked.valid,true);assert.equal(checked.values.recipient,'Nguyễn An');
 assert.equal(checked.values.phone,'+84912345678');assert.equal(checked.values.address,'12 Nguyễn Huệ\nPhường Bến Nghé, TP.HCM');
});
test('delivery validation rejects objects, alphabetic phones, overlong names and unsafe control characters',()=>{
 const valid={recipient:'Nguyễn An',phone:'0912345678',address:'12 Nguyễn Huệ, TP.HCM'};
 for(const [key,value] of [['recipient',{name:'An'}],['recipient','a'.repeat(121)],['recipient','An\nNguyen'],['phone','abcdefghijkl'],['phone',['0912345678']],['address','a'.repeat(751)],['address','12 Nguyễn Huệ\u0000TP.HCM']]){
  const checked=validateDelivery({...valid,[key]:value});assert.equal(checked.valid,false);assert.ok(checked.errors[key]);
 }
 assert.equal(validateDelivery(null).valid,false);
});
test('API rejects missing and short JWT signing secrets without exposing their values',()=>{
 for(const value of [undefined,'','short-sensitive-value',' '.repeat(40),'x'.repeat(31)])assert.throws(()=>requireJwtSecret(value),/JWT_SECRET/);
 assert.equal(requireJwtSecret('x'.repeat(32)),'x'.repeat(32));
});
test('customer order filters reject arrays and invalid paging/status values',()=>{
 assert.deepEqual(customerOrderFilter(),{page:1,status:'all'});
 assert.deepEqual(customerOrderFilter({page:'2',status:'DELIVERED'}),{page:2,status:'DELIVERED'});
 for(const input of [{page:'0'},{page:'1.5'},{page:['1','2']},{status:['PENDING']},{status:"PENDING' OR 1=1"}])assert.throws(()=>customerOrderFilter(input),error=>error.status===400);
});
