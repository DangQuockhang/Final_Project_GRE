import test from 'node:test';
import assert from 'node:assert/strict';
import {createApiRequest} from '../apps/store/src/utils/apiRequest.js';

test('unresponsive API times out so account loading can finish',async()=>{
 const request=createApiRequest('/api',{timeoutMs:20,fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 await assert.rejects(request('/auth/me'),{code:'API_TIMEOUT'});
});
test('caller cancellation is preserved and schema failure does not log out users',async()=>{
 const signal=AbortSignal.abort();
 const cancelled=createApiRequest('/api',{fetchImpl:async(_url,options)=>{options.signal.throwIfAborted();}});
 await assert.rejects(cancelled('/auth/me',{signal}),{name:'AbortError'});
 let expired=false;
 const request=createApiRequest('/api',{onSessionExpired:()=>{expired=true;},fetchImpl:async()=>new Response(JSON.stringify({code:'42P01'}),{status:500})});
 await assert.rejects(request('/auth/me',{token:'fixture'}),{status:500,code:'42P01',message:'Store data is temporarily unavailable. Please contact the shop administrator.'});
 assert.equal(expired,false);
});
test('expired sessions and multipart uploads retain the existing API contract',async()=>{
 let event;
 const request=createApiRequest('/api',{onSessionExpired:data=>{event=data;},fetchImpl:async(url,options)=>{
  assert.equal(url,'/api/auth/me');assert.equal(options.headers.Authorization,'Bearer fixture');
  assert.equal(options.headers['Content-Type'],undefined);assert(options.body instanceof FormData);
  return new Response(JSON.stringify({error:'Sign in again.'}),{status:401});
 }});
 await assert.rejects(request('/auth/me',{method:'PATCH',body:new FormData(),token:'fixture'}),{status:401});
 assert.deepEqual(event,{token:'fixture',message:'Sign in again.'});
});
