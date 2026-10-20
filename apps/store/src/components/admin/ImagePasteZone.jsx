import React,{useRef,useState} from 'react';
import {ClipboardPaste,ImagePlus} from 'lucide-react';
import {imageFilesFromClipboard} from '../../utils/clipboardImages.js';

// Focusable on purpose: admin can click this area, Ctrl+V, or drag and drop.
// Form text fields continue to receive normal text pastes untouched.
export default function ImagePasteZone({label='images',onImages,disabled=false}){
 const ref=useRef(null),[dragging,setDragging]=useState(false);
 const handlePaste=e=>{
  if(disabled)return;
  const imageFiles=imageFilesFromClipboard(e.clipboardData);
  if(!imageFiles.length)return;
  e.preventDefault();
  e.stopPropagation();
  onImages(imageFiles);
 };
 const handleDrop=e=>{
  e.preventDefault();
  setDragging(false);
  if(disabled)return;
  const files=Array.from(e.dataTransfer?.files||[]);
  if(files.length)onImages(files);
 };
 return <div ref={ref} className={'kd-image-paste-zone'+(dragging?' is-dragging':'')}
   tabIndex={disabled?-1:0} role="group"
   aria-label={'Paste '+label+' with Ctrl+V, or drag and drop images here'}
   onPaste={handlePaste} onDrop={handleDrop}
   onDragOver={e=>{e.preventDefault();if(!disabled)setDragging(true);}}
   onDragLeave={()=>setDragging(false)}
   onClick={()=>ref.current?.focus()}>
  <ClipboardPaste size={23} aria-hidden="true"/>
  <div><strong>Paste image here <kbd>Ctrl + V</kbd></strong>
   <span>Copy image or screenshot, click this box and paste — or drag JPG / PNG / WebP here.</span>
  </div>
  <ImagePlus size={20} aria-hidden="true"/>
 </div>;
}
