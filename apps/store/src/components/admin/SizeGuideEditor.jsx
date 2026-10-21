import React,{useEffect,useMemo,useState} from 'react';
import {Ruler,Trash2,Upload} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import ImagePasteZone from './ImagePasteZone.jsx';
import {imageFilesFromClipboard,validateImageFiles} from '../../utils/clipboardImages.js';

// Reused inside Brand Edit and Product Edit without nesting another <form>.
export default function SizeGuideEditor({title,subtitle,url,inheritedUrl=null,uploadPath,api,perform,busy,report}){
 const [file,setFile]=useState(null),[working,setWorking]=useState(false);
 const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const photo=preview||(url?productImageUrl(url,import.meta.env.VITE_API_URL||apiBase):null);
 const inherited=!photo&&inheritedUrl?productImageUrl(inheritedUrl,import.meta.env.VITE_API_URL||apiBase):null;
 function pick(files){
  const list=Array.from(files||[]);
  if(!list.length)return;
  const error=validateImageFiles(list,{maxCount:1});
  if(error){report(error);return;}
  setFile(list[0]);
 }
 function paste(e){
  const images=imageFilesFromClipboard(e.clipboardData);
  if(!images.length)return;
  e.stopPropagation();e.preventDefault();pick(images);
 }
 async function upload(){
  if(!file)return;
  setWorking(true);
  try{
   const data=new FormData();data.append('image',file);
   const ok=await perform(()=>api(uploadPath,{method:'POST',body:data}),'Size guide uploaded separately from product photographs.');
   if(ok)setFile(null);
  }finally{setWorking(false);}
 }
 async function remove(){
  if(!url||!window.confirm('Remove this size guide? The brand/category chart may appear instead.'))return;
  setWorking(true);
  try{await perform(()=>api(uploadPath,{method:'DELETE'}),'Size guide removed.');}
  finally{setWorking(false);}
 }
 return <section className="kd-size-guide-admin" aria-label={title}>
  <div className="kd-quick-step-heading"><div><h4><Ruler size={19}/> {title}</h4><p>{subtitle}</p></div></div>
  <div className="kd-size-guide-admin-stage">
   {photo?<img src={photo} alt="Size guide preview" />:inherited?<img src={inherited} alt="Inherited brand size chart"/>:
    <div className="kd-size-guide-admin-empty"><Ruler size={27}/> No size guide selected</div>}
   <p>{file?'Pending new chart — press SAVE SIZE GUIDE':photo?'Current product/brand chart':inherited?'Using Brand + Category guide':'Size charts are not part of the product photo carousel.'}</p>
  </div>
  <div onPaste={paste} className="kd-size-guide-admin-upload">
   <ImagePasteZone label="size guide" onImages={pick} disabled={busy||working}/>
   <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={'Choose '+title+' photo'} onChange={e=>{pick(e.target.files);e.target.value='';}}/>
  </div>
  <div className="kd-size-guide-admin-actions">
   <button type="button" className="button button-dark" disabled={busy||working||!file} onClick={upload}><Upload size={16}/> SAVE SIZE GUIDE</button>
   {file&&<button type="button" className="border-button" onClick={()=>setFile(null)} disabled={busy||working}>CANCEL SELECTED IMAGE</button>}
   {url&&<button type="button" className="border-button kd-size-remove" disabled={busy||working} onClick={remove}><Trash2 size={15}/> REMOVE CURRENT GUIDE</button>}
  </div>
  <p className="kd-size-guide-help">JPG / PNG / WebP up to 3 MB. Use a clear high-resolution chart. Stored independently — it will not become product image 1/n.</p>
 </section>;
}
