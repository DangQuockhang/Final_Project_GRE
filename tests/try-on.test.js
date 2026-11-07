import {createAccountService} from '../server/src/accountRoutes.js';
import jwt from 'jsonwebtoken';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerTryOnRoutes} from '../server/src/tryOn.js';

function fixture(settings={},providerError=null){
 const routes={},calls=[];
 const authorize=()=>{};
 registerTryOnRoutes({get:(path,...f)=>routes.get=f,post:(path,...f)=>routes.post=f},{authorize,env:settings,createClient:options=>({tokens:{create:async limits=>{calls.push({options,limits});if(providerError)throw providerError;return {apiKey:'short-lived-test-token',expiresAt:'soon'};}}})});
 const run=async(method,origin='http://localhost:5173')=>{
  assert.equal(routes[method][0],authorize);
  const res={code:200,set(){return this;},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
  await routes[method][1]({user:{id:4},get:()=>origin},res);return res;
 };
 return {run,calls};
}
test('try-on defaults off and does not call provider',async()=>{const f=fixture({DECART_API_KEY:'private-test'});assert.equal((await f.run('get')).body.configured,false);assert.equal((await f.run('post')).code,503);assert.equal(f.calls.length,0);});
test('missing key is explicit',async()=>{assert.equal((await fixture({TRY_ON_ENABLED:'true'}).run('post')).code,503);});
test('unapproved origin cannot mint tokens',async()=>{const f=fixture({TRY_ON_ENABLED:'true',DECART_API_KEY:'private-test'});assert.equal((await f.run('post','https://other.example')).code,403);assert.equal(f.calls.length,0);});
test('client token is model/origin/time scoped and permanent key is not returned',async()=>{const f=fixture({TRY_ON_ENABLED:'true',DECART_API_KEY:'private-test'});const result=await f.run('post');assert.equal(result.body.apiKey,'short-lived-test-token');assert(!JSON.stringify(result.body).includes('private-test'));assert.deepEqual(f.calls[0].limits,{expiresIn:60,allowedModels:['lucy-vton-3.6'],allowedOrigins:['http://localhost:5173'],constraints:{realtime:{maxSessionDuration:30}}});const limited=await f.run('post');assert.equal(limited.code,429);assert(limited.body.retryAfterSeconds>0&&limited.body.retryAfterSeconds<=30);});

for(const [status,expected] of [[401,'API key'],[402,'credits'],[403,'permissions'],[429,'rate limiting'],[500,'could not authorize']]){
 test('provider failure '+status+' is actionable without leaking raw details',async()=>{
  const f=fixture({TRY_ON_ENABLED:'true',DECART_API_KEY:'private-test'},{data:{status},message:'private-test sensitive-provider-body'});
  const result=await f.run('post');assert.equal(result.code,502);assert.equal(result.body.providerStatus,status);
  assert.match(result.body.error,new RegExp(expected));assert(!JSON.stringify(result.body).includes('private-test'));
 });
}
test('missing Origin cannot mint a token',async()=>{const f=fixture({TRY_ON_ENABLED:'true',DECART_API_KEY:'private-test'});assert.equal((await f.run('post','')).code,403);assert.equal(f.calls.length,0);});

test('try-on uses real account middleware for missing, expired, blocked and revoked sessions',async()=>{
 const secret='test-only-jwt-secret-at-least-32-characters';let user;
 const {authorize}=createAccountService({secret,pool:{query:async()=>({rows:user?[user]:[]})}});
 const routes={};let calls=0;
 registerTryOnRoutes({get:(path,...f)=>routes.get=f,post:(path,...f)=>routes.post=f},{authorize,env:{TRY_ON_ENABLED:'true',DECART_API_KEY:'test-only'},createClient:()=>{calls++;throw Error('must not call');}});
 const valid=jwt.sign({id:4,version:1},secret,{expiresIn:'1h'});
 for(const [token,record,expected] of [['',null,401],['bad',null,401],[jwt.sign({id:4,version:1},secret,{expiresIn:-1}),null,401],[valid,{id:4,token_version:1,status:'blocked'},403],[valid,{id:4,token_version:2,status:'active'},401],[valid,null,401]]){
  user=record;let denied;await routes.post[0]({headers:{authorization:'Bearer '+token}},{},error=>denied=error);
  assert.equal(denied?.status,expected);
 }
 assert.equal(calls,0);
});
