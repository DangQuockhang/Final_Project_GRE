import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,writeFileSync,unlinkSync} from 'node:fs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
test('admin overview and report URLs filter, paginate, open records and recover on desktop and mobile',{skip:!chrome,timeout:100000},async()=>{
 const file='apps/store/__dashboard-check.html';
 writeFileSync(file,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@fs/'+process.cwd()+'/tests/dashboard-browser.jsx"></script></body></html>',{flag:'wx'});
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','apps/store','--host','127.0.0.1','--port','5188','--strictPort'],{stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5188/__dashboard-check.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready,'Dashboard test server started');
  for(const size of ['1440,1000','500,900']){
   const result=spawnSync(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--window-size='+size,'--virtual-time-budget=20000','--dump-dom','http://127.0.0.1:5188/__dashboard-check.html'],{encoding:'utf8',timeout:35000,maxBuffer:5*1024*1024});
   assert.equal(result.status,0,result.stderr);
   assert.ok(result.stdout.includes('DASHBOARD_CHECKS_PASSED'),size+': '+result.stdout.slice(-7000));
  }
 }finally{vite.kill();unlinkSync(file);}
});
