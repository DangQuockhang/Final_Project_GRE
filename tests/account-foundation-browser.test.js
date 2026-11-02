import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,writeFileSync,unlinkSync} from 'node:fs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
test('customer addresses, checkout prefill and order history work at all five target widths',{skip:!chrome,timeout:200000},async()=>{
 const file='apps/store/__foundation-check.html';
 writeFileSync(file,'<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@fs/'+process.cwd()+'/tests/account-foundation-browser.jsx"></script></body></html>',{flag:'wx'});
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','apps/store','--host','127.0.0.1','--port','5192','--strictPort'],{stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5192/__foundation-check.html')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  assert.ok(ready,'Foundation test server started');
  for(const width of [360,390,768,1024,1440]){
   const result=spawnSync(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--window-size='+width+',1000','--virtual-time-budget=20000','--dump-dom','http://127.0.0.1:5192/__foundation-check.html?viewport='+width],{encoding:'utf8',timeout:35000,maxBuffer:5*1024*1024});
   assert.equal(result.status,0,result.stderr);assert.ok(result.stdout.includes('FOUNDATION_CHECKS_PASSED'),width+': '+result.stdout.slice(-7500));
  }
 }finally{vite.kill();unlinkSync(file);}
});
