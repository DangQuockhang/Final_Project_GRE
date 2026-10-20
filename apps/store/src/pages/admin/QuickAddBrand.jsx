import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ImagePlus,Plus,Save,X} from 'lucide-react';
import {validateBrand} from '../../utils/adminValidation.js';
import ImagePasteZone from '../../components/admin/ImagePasteZone.jsx';
import {imageFilesFromClipboard,validateImageFiles} from '../../utils/clipboardImages.js';

export default function QuickAddBrand({brands,api,perform,busy,report,onCreated,onClose}){
 const [name,setName]=useState(''),[description,setDescription]=useState('');
 const [file,setFile]=useState(null),[working,setWorking]=useState(false);
 const closeRef=useRef(null);
 const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 useEffect(()=>{
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  // Capture Escape before the outer Edit Product window handler can close
  // both dialogs. Closing this popup must preserve the product draft.
  const onKey=e=>{
   if(e.key==='Escape'){
    e.stopPropagation();
    if(!busy&&!working)onClose();
   }
  };
  document.addEventListener('keydown',onKey,true);
  return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',onKey,true);};
 },[busy,working,onClose]);
 function pick(input){
  const files=Array.from(input||[]);
  if(!files.length)return;
  const issue=validateImageFiles(files,{maxCount:1});
  if(issue){report(issue);return;}
  setFile(files[0]);
 }
 function paste(e){
  const images=imageFilesFromClipboard(e.clipboardData);
  if(!images.length)return;
  e.preventDefault();
  e.stopPropagation(); // prevent the outer product editor from consuming this photo
  pick(images);
 }
 async function submit(event){
  event.preventDefault();
  event.stopPropagation(); // React portal events bubble through the ProductEditor tree; never submit a product here.
  const draft={name:name.trim(),description};
  const issue=validateBrand(draft);
  if(issue){report(issue);return;}
  const existing=brands.find(b=>b.name.trim().toLowerCase()===draft.name.toLowerCase());
  if(existing){
   onCreated(String(existing.id));onClose();
   return;
  }
  setWorking(true);
  let created=null,logoError=null;
  try{
   const ok=await perform(async()=>{
    created=await api('/brands',{method:'POST',body:draft});
    if(file){
     const form=new FormData();form.append('image',file);
     try{
      await api('/admin/brands/'+created.id+'/logo',{method:'POST',body:form});
     }catch(error){logoError=error;}
    }
   },'Brand created and selected.');
   if(ok&&created){
    onCreated(String(created.id));
    onClose();
    if(logoError)report('Brand created and selected, but the image upload failed. You can retry it under Brands → Edit. '+(logoError.message||''));
   }
  }finally{setWorking(false);}
 }
 return createPortal(<div className="kd-quick-brand-backdrop" role="presentation">
  <section role="dialog" aria-modal="true" aria-labelledby="kd-quick-brand-heading" className="kd-quick-brand-modal">
   <div className="kd-edit-modal-header">
    <div><span>PRODUCT WORKSPACE</span><h2 id="kd-quick-brand-heading">Quick add brand</h2></div>
    <button ref={closeRef} className="kd-edit-modal-close" type="button" aria-label="Close quick add brand" disabled={busy||working} onClick={onClose}><X size={22}/></button>
   </div>
   <form className="kd-quick-brand-form" onSubmit={submit} onPaste={paste}>
    <p>Add a brand here without losing any unsaved product details. New brands appear in your regular Brand Management page.</p>
    <label>BRAND NAME <input required minLength={2} maxLength={120} autoComplete="off" value={name} onChange={e=>setName(e.target.value)} placeholder="New brand name"/></label>
    <label>DESCRIPTION (OPTIONAL) <textarea rows={3} maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="A few words about the brand"/></label>
    <label>LOGO (OPTIONAL — JPG, PNG, WEBP) <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{pick(e.target.files);e.target.value='';}}/></label>
    <ImagePasteZone label="new brand logo" onImages={pick} disabled={busy||working}/>
    {file&&<button type="button" className="border-button kd-clear-selected-image" disabled={busy||working} onClick={()=>setFile(null)}>CLEAR SELECTED IMAGE</button>}
    {preview&&<div className="kd-quick-brand-photo"><img src={preview} alt="Selected brand logo preview"/></div>}
    {!preview&&<div className="kd-quick-brand-logo-placeholder"><ImagePlus size={24}/> Brand logo can be added later</div>}
    <div className="kd-quick-brand-actions">
     <button type="button" className="border-button" onClick={onClose} disabled={busy||working}>CANCEL</button>
     <button type="submit" className="button button-dark" disabled={busy||working}><Save size={17}/>{working?'CREATING BRAND…':'CREATE & SELECT BRAND'}</button>
    </div>
   </form>
  </section>
 </div>,document.body);
}
