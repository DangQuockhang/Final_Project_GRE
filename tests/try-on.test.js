import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerTryOnRoutes} from '../server/src/tryOn.js';

function fixture(settings={}){
 const routes={},calls=[];
 const authorize=()=>{};
 registerTryOnRoutes({get:(path,...f)=>routes.get=f,post:(path,...f)=>routes.post=f},{authorize,env:settings,createClient:options=>({tokens:{create:async limits=>{calls.push({options,limits});return {apiKey:'short-lived-test-token',expiresAt:'soon'};}}})});
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
test('client token is model/origin/time scoped and permanent key is not returned',async()=>{const f=fixture({TRY_ON_ENABLED:'true',DECART_API_KEY:'private-test'});const result=await f.run('post');assert.equal(result.body.apiKey,'short-lived-test-token');assert(!JSON.stringify(result.body).includes('private-test'));assert.deepEqual(f.calls[0].limits,{expiresIn:60,allowedModels:['lucy-vton-3.6'],allowedOrigins:['http://localhost:5173'],constraints:{realtime:{maxSessionDuration:30}}});assert.equal((await f.run('post')).code,429);});
