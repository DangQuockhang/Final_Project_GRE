import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordError,profileValues,publicUser,normalizeEmail,validEmail} from '../server/src/accountValidation.js';
import {resetMailConfig} from '../server/src/accountEmail.js';
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

test('reset email requires configured sender and a safe storefront origin',()=>{
 const keys=['RESEND_API_KEY','MAIL_FROM','APP_URL'],previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  for(const key of keys)delete process.env[key];
  assert.equal(resetMailConfig(),null);
  process.env.RESEND_API_KEY='test-only';process.env.MAIL_FROM='test@example.test';
  for(const url of ['http://store.example','https://user:password@store.example','javascript:alert(1)']){
   process.env.APP_URL=url;assert.equal(resetMailConfig(),null);
  }
  process.env.APP_URL='http://localhost:5173';assert.equal(resetMailConfig().origin,'http://localhost:5173');
  process.env.APP_URL='https://store.example/path';assert.equal(resetMailConfig().origin,'https://store.example');
 }finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
