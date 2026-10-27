import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
test('Reno gallery: color, navigation, viewer, zoom and admin cover save',{skip:!chrome,timeout:60000},async()=>{
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','apps/store','--host','127.0.0.1','--port','5187','--strictPort'],{stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<60;i++){try{const response=await fetch('http://127.0.0.1:5187/gallery-demo.html');if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready,'Vite demo server started');
  const result=spawnSync(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:5187/gallery-demo.html?check'],{encoding:'utf8',timeout:35000,maxBuffer:5*1024*1024});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/GALLERY_CHECKS_PASSED/,result.stdout.slice(-5000));
 }finally{vite.kill();}
});
