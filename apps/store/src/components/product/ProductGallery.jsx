import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft,ChevronRight,Maximize2,Minus,Plus,X,RotateCcw} from 'lucide-react';
import {ProductMedia} from './ProductCard.jsx';
import {nextImage} from '../../utils/productGallery.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function Viewer({images,index,setIndex,onClose,name}){
 const [scale,setScale]=useState(1),[offset,setOffset]=useState({x:0,y:0});
 const pointer=useRef(null),touchPoints=useRef(new Map()),pinch=useRef(null),modal=useRef(null),close=useRef(null);
 const move=delta=>{setIndex(i=>nextImage(i,delta,images.length));setScale(1);setOffset({x:0,y:0});};
 useEffect(()=>{
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const before=document.activeElement;close.current?.focus();
  const handle=e=>{
   if(e.key==='Escape'){e.preventDefault();onClose();}
   if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
   if(e.key==='ArrowRight'){e.preventDefault();move(1);}
  };
  document.addEventListener('keydown',handle);
  return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handle);before?.focus?.();};
 },[onClose,images.length]);
 const zoom=delta=>{
  setScale(previous=>{
   const next=clamp(Math.round((previous+delta)*10)/10,1,4);
   if(next===1)setOffset({x:0,y:0});
   return next;
  });
 };
 const distance=()=>{const pts=[...touchPoints.current.values()];return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);};
 const start=e=>{
  if(e.button!==0)return;
  e.currentTarget.setPointerCapture?.(e.pointerId);
  touchPoints.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touchPoints.current.size===2){
   pinch.current={distance:distance(),scale};
   pointer.current=null;
  }else if(touchPoints.current.size===1){
   pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{...offset}};
  }
 };
 const drag=e=>{
  if(!touchPoints.current.has(e.pointerId))return;
  touchPoints.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touchPoints.current.size===2&&pinch.current){
   const ratio=distance()/Math.max(1,pinch.current.distance);
   setScale(clamp(pinch.current.scale*ratio,1,4));
   return;
  }
  if(!pointer.current||pointer.current.id!==e.pointerId||scale===1)return;
  const nextX=pointer.current.origin.x+e.clientX-pointer.current.x;
  const nextY=pointer.current.origin.y+e.clientY-pointer.current.y;
  setOffset({x:clamp(nextX,-window.innerWidth*1.5,window.innerWidth*1.5),y:clamp(nextY,-window.innerHeight*1.5,window.innerHeight*1.5)});
 };
 const stop=e=>{
  const swipe=pointer.current?.id===e.pointerId&&touchPoints.current.size===1;
  const dx=swipe?e.clientX-pointer.current.x:0,dy=swipe?e.clientY-pointer.current.y:0;
  touchPoints.current.delete(e.pointerId);
  pointer.current=null;
  if(touchPoints.current.size<2)pinch.current=null;
  if(swipe&&scale===1&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))move(dx>0?-1:1);
 };
 const wheel=e=>{
  if(!e.ctrlKey&&!e.altKey)return;
  e.preventDefault();
  zoom(e.deltaY<0?.2:-.2);
 };
 return createPortal(<div className="kd-v2-lightbox" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="kd-v2-lightbox-dialog" ref={modal} role="dialog" aria-modal="true" aria-label={'Zoom images of '+name}>
   <header className="kd-v2-lightbox-header">
    <span>{name}</span>
    <div className="kd-v2-lightbox-tools">
     <button type="button" onClick={()=>zoom(-.25)} disabled={scale<=1} aria-label="Zoom out"><Minus size={21}/></button>
     <span aria-live="polite">{Math.round(scale*100)}%</span>
     <button type="button" onClick={()=>zoom(.25)} disabled={scale>=4} aria-label="Zoom in"><Plus size={21}/></button>
     <button type="button" aria-label="Reset zoom" onClick={()=>{setScale(1);setOffset({x:0,y:0})}}><RotateCcw size={19}/></button>
     <button ref={close} type="button" className="kd-v2-lightbox-close" aria-label="Close image viewer" onClick={onClose}><X size={24}/></button>
    </div>
   </header>
   <div className={'kd-v2-lightbox-stage'+(scale>1?' is-zoomed':'')} onPointerDown={start} onPointerMove={drag} onPointerUp={stop} onPointerCancel={stop} onDoubleClick={()=>{zoom(scale===1?1:-3);setOffset({x:0,y:0})}} onWheel={wheel}>
    <img draggable={false} src={images[index]} alt={name+' photo '+(index+1)} style={{transform:'translate('+offset.x+'px,'+offset.y+'px) scale('+scale+')'}}/>
   </div>
   <footer className="kd-v2-lightbox-footer">
    <button type="button" aria-label="Previous photo" onClick={()=>move(-1)} disabled={images.length<2}><ChevronLeft size={24}/></button>
    <span aria-live="polite">{index+1} / {images.length}</span>
    <button type="button" aria-label="Next photo" onClick={()=>move(1)} disabled={images.length<2}><ChevronRight size={24}/></button>
   </footer>
  </section>
 </div>,document.body);
}
export default function ProductGallery({product,images=[]}){
 const [index,setIndex]=useState(0),[open,setOpen]=useState(false);
 const firstTouch=useRef(null);
 useEffect(()=>{setIndex(0);setOpen(false)},[product?.slug]);
 useEffect(()=>{setIndex(i=>Math.min(i,Math.max(0,images.length-1)))},[images.length]);
 const change=delta=>setIndex(i=>nextImage(i,delta,images.length));
 const touchStart=e=>{firstTouch.current={x:e.touches[0]?.clientX,y:e.touches[0]?.clientY}};
 const touchEnd=e=>{
  if(!firstTouch.current)return;
  const dx=e.changedTouches[0]?.clientX-firstTouch.current.x,dy=e.changedTouches[0]?.clientY-firstTouch.current.y;
  firstTouch.current=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))change(dx>0?-1:1);
 };
 return <div className="kd-v2-product-gallery" aria-label="Product photography">
  <div className="kd-v2-gallery-stage" onTouchStart={touchStart} onTouchEnd={touchEnd}>
   {images.length?
    <button className="kd-v2-gallery-main" type="button" aria-label={'Expand photo '+(index+1)+' of '+images.length} onClick={()=>setOpen(true)}>
     <img key={images[index]} src={images[index]} loading={index===0?'eager':'lazy'} alt={product.name+' view '+(index+1)} draggable={false}/>
     <span className="kd-v2-gallery-expand"><Maximize2 size={19}/> View details</span>
    </button>:
    <div className="kd-v2-gallery-main kd-v2-gallery-placeholder"><ProductMedia product={product} large/></div>}
   {images.length>1&&<>
    <button type="button" className="kd-v2-gallery-arrow is-prev" aria-label="Previous product image" onClick={()=>change(-1)}><ChevronLeft size={26}/></button>
    <button type="button" className="kd-v2-gallery-arrow is-next" aria-label="Next product image" onClick={()=>change(1)}><ChevronRight size={26}/></button>
   </>}
  </div>
  {images.length>0&&<>
   <div className="kd-v2-gallery-meta">
    <span>PRODUCT GALLERY</span>
    <span aria-live="polite" aria-atomic="true">{index+1} / {images.length}</span>
   </div>
   {images.length>1&&<div className="kd-v2-gallery-thumbs" aria-label="Choose an image">
    {images.map((url,i)=><button type="button" key={url} className={index===i?'is-active':''} aria-label={'Show product photo '+(i+1)} aria-pressed={index===i} onClick={()=>setIndex(i)}>
     <img src={url} alt="" loading="lazy"/>
    </button>)}
   </div>}
  </>}
  {open&&images.length>0&&<Viewer images={images} index={index} setIndex={setIndex} onClose={()=>setOpen(false)} name={product.name}/>}
 </div>;
}
