import React,{useEffect,useMemo} from 'react';
import {Ruler,Trash2} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import ImagePasteZone from './ImagePasteZone.jsx';
import {imageFilesFromClipboard,validateImageFiles} from '../../utils/clipboardImages.js';

/** Size guide staged as a multipart file in the parent ProductEditor's single Save.
 * No Product ID or second upload action is needed when adding/duplicating.
 */
export default function SizeGuideDraftPicker({file,onChange,brand,category,disabled=false,report}){
 const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const defaultGuide=brand?.size_guides?.[category];
 const inherited=defaultGuide?productImageUrl(defaultGuide,import.meta.env.VITE_API_URL||apiBase):null;
 const picture=preview||inherited;
 function select(files){
  const candidates=Array.from(files||[]);
  if(!candidates.length)return;
  const error=validateImageFiles(candidates,{maxCount:1});
  if(error){report(error);return;}
  onChange(candidates[0]);
 }
 function paste(event){
  const images=imageFilesFromClipboard(event.clipboardData);
  if(!images.length)return;
  event.stopPropagation();
  event.preventDefault();
  select(images);
 }
 return <section className="kd-size-guide-admin" aria-label="Size guide for new product" onPaste={paste}>
  <div className="kd-quick-step-heading">
   <div><h4><Ruler size={19}/> 3. Size guide (optional)</h4>
    <p>Choose or paste a product-specific size chart now. It is saved with your product in one step, not added to the shopping photo gallery.</p>
   </div>
  </div>
  <div className="kd-size-guide-admin-stage">
   {picture?<img src={picture} alt={file?'Selected size guide':'Default size guide for chosen brand and category'}/>:
    <div className="kd-size-guide-admin-empty"><Ruler size={27}/> No size guide selected</div>}
   <p>{file?'New size guide ready — will be saved when you create the product.':
    inherited?'Default chart from '+brand.name+' / '+category+' — no upload required.':
    'No chart yet. You can leave this empty or add one now.'}</p>
  </div>
  <ImagePasteZone label="product size guide" onImages={select} disabled={disabled}/>
  <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose size guide for new product"
   disabled={disabled} onChange={event=>{select(event.target.files);event.target.value='';}}/>
  {file&&<button type="button" className="border-button kd-size-remove" disabled={disabled}
   onClick={()=>onChange(null)}><Trash2 size={16}/> REMOVE SELECTED GUIDE</button>}
  <p className="kd-size-guide-help">JPG / PNG / WebP, max 3 MB. Size guide is stored separately from the photo carousel. You can still replace it in Edit later.</p>
 </section>;
}
