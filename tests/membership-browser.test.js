import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,writeFileSync,unlinkSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function connect(url){
 const socket=new WebSocket(url);let next=0;const pending=new Map();
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);const request=pending.get(message.id);if(!request)return;pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(new Error(JSON.stringify(message.error))):request.resolve(message.result);});
 return {close:()=>socket.close(),send:(method,params={})=>new Promise((resolve,reject)=>{
  const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
 })};
}
test('membership cards and audited order actions work at five viewport widths',{skip:!chrome,timeout:200000},async()=>{
 const file='apps/store/__membership-check.html';
 writeFileSync(file,'<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@fs/'+process.cwd()+'/tests/membership-browser.jsx"></script></body></html>',{flag:'wx'});
 const profile=mkdtempSync(join(tmpdir(),'kd-membership-chrome-'));
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','apps/store','--host','127.0.0.1','--port','5276','--strictPort'],{stdio:'ignore'});
 const browser=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=5277','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5276/__membership-check.html')).ok&&(await fetch('http://127.0.0.1:5277/json/version')).ok){ready=true;break;}}catch{}await delay(250);}
  assert.ok(ready,'Membership test server and Chrome started');
  for(const width of [360,390,768,1024,1440]){
   const page=await (await fetch('http://127.0.0.1:5277/json/new?about:blank',{method:'PUT'})).json();
   const cdp=await connect(page.webSocketDebuggerUrl);
   try{
    // Browser window sizes can enforce a desktop minimum. Emulate the actual CSS viewport.
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await cdp.send('Page.navigate',{url:'http://127.0.0.1:5276/__membership-check.html?viewport='+width});
    let result='';
    for(let attempt=0;attempt<140;attempt++){
     const evaluation=await cdp.send('Runtime.evaluate',{expression:"document.querySelector('output:not([hidden])')?.textContent || ''",returnByValue:true});
     result=evaluation.result?.value||'';
     if(result.includes('MEMBERSHIP_CHECKS_'))break;
     await delay(200);
    }
    assert.equal(result,'MEMBERSHIP_CHECKS_PASSED',width+': '+(result||'Timed out waiting for fixture'));
   }finally{cdp.close();await fetch('http://127.0.0.1:5277/json/close/'+page.id);}
  }
 }finally{
  vite.kill();
  const exited=browser.exitCode!==null?Promise.resolve():new Promise(resolve=>browser.once('exit',resolve));
  try{
   const version=await (await fetch('http://127.0.0.1:5277/json/version')).json();
   const control=await connect(version.webSocketDebuggerUrl);
   try{await control.send('Browser.close');}finally{control.close();}
  }catch{browser.kill();}
  await Promise.race([exited,delay(2000)]);
  unlinkSync(file);
  // Chrome subprocesses may still flush their temporary profile after the parent exits.
  // Cleanup must not mask a failed assertion (or turn a passing test into a failure).
  try{rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});}
  catch(error){if(error.code!=='ENOTEMPTY'&&error.code!=='EBUSY')throw error;}
 }
});
