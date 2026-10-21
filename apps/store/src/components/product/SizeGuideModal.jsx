import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Ruler,X,ExternalLink} from 'lucide-react';
export default function SizeGuideModal({src,name,onClose}){
 const close=useRef(null);
 useEffect(()=>{
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const before=document.activeElement;close.current?.focus();
  const key=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}};
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);before?.focus?.();};
 },[onClose]);
 return createPortal(<div className="kd-v2-size-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="kd-v2-size-dialog" role="dialog" aria-modal="true" aria-labelledby="kd-size-guide-title">
   <header><div><span>FIT & MEASUREMENTS</span><h2 id="kd-size-guide-title">Size guide</h2><p>{name}</p></div>
    <button ref={close} type="button" aria-label="Close size guide" onClick={onClose}><X size={22}/></button>
   </header>
   <div className="kd-v2-size-picture"><img src={src} alt={'Size chart for '+name}/></div>
   <div className="kd-v2-size-explain"><Ruler size={19}/><p>Size charts vary by brand and product. Compare the measurements with an item you own. The chart is not a guarantee of fit.</p></div>
   <a className="kd-v2-size-original" href={src} target="_blank" rel="noopener noreferrer">
    <ExternalLink size={17}/> View original image at full resolution
   </a>
  </section>
 </div>,document.body);
}
