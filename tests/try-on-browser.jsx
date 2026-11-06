import React from 'react';
import {createRoot} from 'react-dom/client';
import LiveTryOn from '../apps/store/src/components/try-on/LiveTryOn.jsx';
const assert=(value,message)=>{if(!value)throw Error(message);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let cameraMode='ok',connectMode='ok',cameraResolve,connectResolve,options,lastStream,disconnects=0,changes=0,mints=0;
const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
const stream=()=>{const value=canvas.captureStream(25); canvas.getContext('2d').fillRect(0,0,640,480);return value;};
setInterval(()=>canvas.getContext('2d').fillRect(0,0,640,480),40);
let clockOffset=0;const realNow=Date.now;Date.now=()=>realNow()+clockOffset;
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
 if(cameraMode==='deny')throw new DOMException('denied','NotAllowedError');
 if(cameraMode==='wait')return new Promise(r=>cameraResolve=r);
 lastStream=stream();return lastStream;
}}});
window.fetch=async(url,init={})=>{assert(String(url).endsWith('/try-on'),'No external requests');if(init.method==='POST')mints++;return {ok:true,json:async()=>({configured:true,apiKey:'test-ephemeral'})};};
const result={disconnect(){disconnects++;},on(){},async set(){changes++;}};
const loadSdk=async()=>({models:{realtime:()=>({width:640,height:480,fps:25})},createDecartClient:config=>({realtime:{connect:async(input,opts)=>{
 options=opts;await config.apiKeyProvider();assert(opts.retries===0&&opts.capacityRetryBudgetMs===0,'retries disabled');
 if(connectMode==='wait')return new Promise(r=>connectResolve=r);
 if(connectMode!=='no-video')opts.onRemoteStream(stream());return result;
}}})});
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(<LiveTryOn token="test-user" initialGarment={{name:'Selected black shirt',image:'/garments/sample-2.png'}} loadSdk={loadSdk}/>);
const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.includes(text));
async function start(){clockOffset+=31000;await wait(300);button('Start 30-second').click();await wait(200);}
async function run(){
 render();await wait(150);
 assert(button('Start 30-second').disabled,'consent required');
 document.querySelector('input[type=checkbox]').click();await wait(50);
 cameraMode='deny';await start();assert(document.querySelector('[role=alert]').textContent.includes('permission'),'camera denial inline');assert(mints===0,'no token before camera');
 cameraMode='wait';await start();button('Stop &').click();await wait(30);lastStream=stream();cameraResolve(lastStream);await wait(80);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'late camera stopped');assert(mints===0,'cancelled camera never mints');
 cameraMode='ok';connectMode='wait';await start();button('Stop &').click();await wait(30);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'Stop during connect shuts camera');connectResolve(result);await wait(80);assert(disconnects===1,'late session disconnected');
 connectMode='no-video';await start();assert(!document.querySelector('.live-status').textContent.includes('Live AI'),'connected without frames is not live');clockOffset+=31000;await wait(300);assert(document.querySelector('[role=alert]').textContent.includes('No playable AI video'),'missing video is a timeout error');
 connectMode='ok';await start();assert(document.querySelector('.live-status').textContent.includes('Live AI'),'live only after remote stream');
 button('Statement knitwear').click();await wait(60);assert(changes===1,'garment updated in same session');assert(document.querySelector('.live-status').textContent.includes('Garment sent'),'change success');
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));await wait(60);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'hidden stops camera');Object.defineProperty(document,'hidden',{configurable:true,value:false});
 await start();window.dispatchEvent(new Event('pagehide'));await wait(50);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'pagehide stops camera');
 const input=document.querySelector('input[type=file]');const dt=new DataTransfer();dt.items.add(new File(['bad'],'bad.txt',{type:'text/plain'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));await wait(60);assert(document.querySelector('[role=alert]').textContent.includes('5 MB'),'invalid upload error');
 assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
 await start();const originalNow=Date.now;Date.now=()=>originalNow()+31000;await wait(400);Date.now=originalNow;assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'30 second local cap');
 await start();root.unmount();await wait(50);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'unmount stops camera');
}
run().then(()=>{document.body.innerHTML='<output>TRY_ON_CHECKS_PASSED</output>';}).catch(e=>{document.body.innerHTML='<output>TRY_ON_CHECKS_FAILED: '+e.message+'</output>';});
