import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordError,profileValues,publicUser,normalizeEmail,validEmail} from '../server/src/accountValidation.js';
import {validatePassword} from '../apps/store/src/utils/accountValidation.js';
test('password limits respect bcrypt UTF-8 bytes and match client checks',()=>{
 for(const value of ['short','        ','x'.repeat(73),'ệ'.repeat(25)]){assert.ok(passwordError(value));assert.ok(validatePassword(value));}
 assert.equal(passwordError('Abc12345'),'');assert.equal(validatePassword('ệ'.repeat(24)),'');
});
test('profile normalizes optional phone and rejects malformed names',()=>{
 assert.deepEqual(profileValues({name:'  Khách Hàng  ',phone:'+84 912-345-678'}),{name:'Khách Hàng',phone:'+84912345678'});
 assert.equal(profileValues({name:'Khách',phone:''}).phone,null);
 assert.ok(profileValues({name:'X',phone:''}).error);
 assert.ok(profileValues({name:'Khách',phone:'abc12345'}).error);
 assert.equal(normalizeEmail(' HELLO@example.com '),'hello@example.com');
 assert.equal(validEmail('a@b.com'),true);
});
test('user serializer never exposes password hashes or session versions',()=>{
 const safe=publicUser({id:1,name:'User',email:'u@example.test',password_hash:'private',token_version:7,role:'user'});
 assert.equal('password_hash' in safe,false);assert.equal('token_version' in safe,false);
});
