import React from 'react';
import { checkCameraLoopback } from './try-on-camera-loopback.js';
import {createRoot} from 'react-dom/client';
import LiveTryOn from '../apps/store/src/components/try-on/LiveTryOn.jsx';
const assert=(value,message)=>{if(!value)throw Error(message);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let setMode='ok',imageMode='ok',setResolve; const listeners={};
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
const realFetch=window.fetch.bind(window);
window.fetch=async(url,init={})=>{if(new URL(url,location.origin).pathname.startsWith('/garments/')){assert(new URL(url,location.origin).origin===location.origin,'only local garment requests');if(imageMode==='broken')return new Response('not an image',{headers:{'content-type':'image/png'}});return realFetch(url,init);}assert(String(url).endsWith('/try-on'),'No external requests');if(init.method==='POST')mints++;return {ok:true,json:async()=>({configured:true,apiKey:'test-ephemeral',setupSeconds:60,liveSeconds:30,sessionSeconds:90,tokenTtlSeconds:120,cooldownSeconds:90})};};
const result={disconnect(){disconnects++;},on(event,callback){listeners[event]=callback;},async set(input){assert(input.image instanceof Blob,'validated image bytes sent');changes++;if(setMode==='wait')return new Promise(r=>setResolve=r);if(setMode==='reject')throw Error('Garment rejected by provider');}};
const loadSdk=async()=>({models:{realtime:()=>({width:640,height:480,fps:25})},createDecartClient:config=>({realtime:{connect:async(input,opts)=>{
 assert(input===lastStream && opts.mirror===false && opts.preferredVideoCodec==='vp8','original camera track published with VP8, no generated mirror track');
 options=opts;assert(!opts.initialState?.image,'garment applied after connecting');await config.apiKeyProvider();assert(opts.retries===0&&opts.capacityRetryBudgetMs===0,'retries disabled');
 if(connectMode==='reject'){opts.onConnectionChange('disconnected');throw Error('Try Again Later: capacity');}
 if(connectMode==='queue'){opts.onQueuePosition({position:4,queueSize:10});return new Promise(r=>connectResolve=r);}
 if(connectMode==='wait')return new Promise(r=>connectResolve=r);
 if(connectMode!=='no-video')opts.onRemoteStream(stream());return result;
}}})});
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(<LiveTryOn token="test-user" initialGarment={{name:'Selected black shirt',image:'/garments/sample-2.png'}} loadSdk={loadSdk}/>);
const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent.includes(text));
async function start(){clockOffset+=91000;await wait(300);button('Start live').click();await wait(450);}
async function run(){
 await checkCameraLoopback(stream(), assert);
 render();await wait(150);
 assert(button('Start live').disabled,'consent required');
 document.querySelector('input[type=checkbox]').click();await wait(50);
 imageMode='broken';await start();assert(document.querySelector('[role=alert]').textContent.includes('cannot be decoded'),'bad image fails before a session');assert(mints===0,'bad image never mints');imageMode='ok';
 cameraMode='deny';await start();assert(document.querySelector('[role=alert]').textContent.includes('permission'),'camera denial inline');assert(mints===0,'no token before camera');
 cameraMode='wait';await start();button('Stop &').click();await wait(30);lastStream=stream();cameraResolve(lastStream);await wait(80);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'late camera stopped');assert(mints===0,'cancelled camera never mints');
 cameraMode='ok';const originalPlay=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){return Promise.reject(Error('blocked'));};
 await start();assert(document.querySelector('[role=alert]').textContent.includes('camera preview'),'local playback failure before billing');assert(mints===0,'no token without camera frames');HTMLMediaElement.prototype.play=originalPlay;
 cameraMode='ok';connectMode='wait';await start();button('Stop &').click();await wait(30);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'Stop during connect shuts camera');connectResolve(result);await wait(80);assert(disconnects===1,'late session disconnected');
 connectMode='reject';await start();assert(document.querySelector('[role=alert]').textContent.includes('processing slot'),'disconnect callback does not hide capacity rejection');assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'capacity failure stops camera');
 connectMode='queue';await start();assert(document.querySelector('.live-status').textContent.includes('queue position: 4'),'real queue event shown');clockOffset+=61000;await wait(300);assert(document.querySelector('[role=alert]').textContent.includes('reported a queue'),'queue timeout distinct');connectResolve(result);await wait(80);
 connectMode='ok';setMode='reject';await start();assert(document.querySelector('[role=alert]').textContent.includes('Garment rejected'),'initial garment rejection stops the trial');assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'rejected garment stops camera');setMode='ok';
 connectMode='ok';setMode='wait';await start();clockOffset+=61000;await wait(300);assert(document.querySelector('[role=alert]').textContent.includes('acknowledge'),'garment ACK timeout distinct even with incoming video');setResolve();await wait(80);setMode='ok';
 connectMode='no-video';await start();assert(!document.querySelector('.live-status').textContent.includes('Live AI'),'connected without frames is not live');clockOffset+=61000;await wait(300);assert(document.querySelector('[role=alert]').textContent.includes('No playable AI video'),'missing video is a timeout error');

 // A slow provider must not lose the whole preview allowance to setup.
 connectMode='no-video';await start();const beforeDelayed=mints;
 clockOffset+=45000;await wait(300);
 assert(lastStream.getVideoTracks()[0].readyState==='live','camera stays open beyond old 30-second setup cap');
 assert(document.querySelector('.video-label').textContent.includes('Preparing AI'),'setup is labelled separately');
 options.onRemoteStream(stream());await wait(150);
 assert(document.querySelector('.live-status').textContent.includes('Live AI'),'late remote video starts live allowance');
 clockOffset+=20000;await wait(300);
 assert(lastStream.getVideoTracks()[0].readyState==='live','still has 30-second preview after 45-second preparation');
 button('Statement knitwear').click();await wait(80);
 document.querySelector('video[aria-label="AI try-on"]').dispatchEvent(new Event('playing'));
 clockOffset+=11000;await wait(300);
 assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'new garment and repeated playing do not reset live deadline');
 assert(document.querySelector('.live-status').textContent.includes('preview complete'),'normal preview expiry is not an error');
 assert(mints===beforeDelayed,'slow setup never mints another token');
 connectMode='ok';await start();assert(document.querySelector('.live-status').textContent.includes('Live AI'),'live only after remote stream');
 listeners.stats({outboundVideo:{bytesSent:1234},video:{framesReceived:10,framesDecoded:9},token:'private-test-value'});await wait(30);assert(document.querySelector('.connection-details').textContent.includes('1234'),'safe stats shown');assert(!document.body.textContent.includes('private-test-value'),'raw stats never rendered');
 options.onConnectionChange('disconnected');listeners.sessionEnded({reason:'insufficient_credits'});await wait(50);assert(document.querySelector('[role=alert]').textContent.includes('credits are insufficient'),'provider reason survives disconnect');
 await start();
 button('Statement knitwear').click();await wait(60);assert(changes>=2,'initial garment and replacement sent through acknowledged set');assert(document.querySelector('.live-status').textContent.includes('Garment sent'),'change success');
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));await wait(60);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'hidden stops camera');Object.defineProperty(document,'hidden',{configurable:true,value:false});
 await start();window.dispatchEvent(new Event('pagehide'));await wait(50);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'pagehide stops camera');
 const input=document.querySelector('input[type=file]');const dt=new DataTransfer();dt.items.add(new File(['bad'],'bad.txt',{type:'text/plain'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));await wait(60);assert(document.querySelector('[role=alert]').textContent.includes('5 MB'),'invalid upload error');
 assert(document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
 await start();const originalNow=Date.now;Date.now=()=>originalNow()+31000;await wait(400);Date.now=originalNow;assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'30 second local cap');
 cameraMode='wait';await start();const oldCamera=cameraResolve;button('Stop &').click();await wait(30);
 cameraMode='ok';connectMode='wait';await start();const currentConnect=connectResolve;const mintCount=mints;
 oldCamera(stream());await wait(60);button('Stop &').click();await wait(30);await start();
 assert(mints===mintCount,'late cancelled attempt cannot unlock another pending connection');
 assert(document.querySelector('[role=alert]').textContent.includes('previous connection'),'pending session stays guarded after an older camera resolves');
 currentConnect(result);await wait(80);connectMode='ok';
 await start();root.unmount();await wait(50);assert(lastStream.getTracks().every(t=>t.readyState==='ended'),'unmount stops camera');
}
run().then(()=>{document.body.innerHTML='<output>TRY_ON_CHECKS_PASSED</output>';}).catch(e=>{document.body.innerHTML='<output>TRY_ON_CHECKS_FAILED: '+e.message+'</output>';});
