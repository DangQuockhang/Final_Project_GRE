import React,{useEffect,useRef} from 'react';
import {apiBase,productImageUrl} from '@kd/catalog';
import '../../styles/product-details.css';

import {readDocument} from '../../utils/detailDocument.js';
export default function ProductDetailsEditor({blocks,onChange,report,disabled=false}){
 const editor=useRef(null),picker=useRef(null),selection=useRef(null),images=useRef(new Map()),counter=useRef(0);
 const urls=useRef([]),initial=useRef(blocks);
 const history=useRef([]),position=useRef(-1);
 const emit=()=>onChange(readDocument(editor.current,images.current));
 function checkpoint(){
  const html=editor.current.innerHTML;
  if(history.current[position.current]===html)return;
  history.current=history.current.slice(0,position.current+1);
  history.current.push(html);
  if(history.current.length>100)history.current.shift();
  position.current=history.current.length-1;emit();
 }
 function imageNode(block){
  const id=String(++counter.current);images.current.set(id,block);
  const img=document.createElement('img');img.dataset.detailId=id;
  img.alt=block.caption||'Product detail';img.draggable=false;
  if(block.file){img.src=URL.createObjectURL(block.file);urls.current.push(img.src);}
  else img.src=productImageUrl(block.url,import.meta.env.VITE_API_URL||apiBase);
  return img;
 }
 useEffect(()=>{
  const root=editor.current;root.replaceChildren();images.current.clear();
  for(const block of initial.current){
   if(block.type==='image')root.append(imageNode(block));
   else{const p=document.createElement(block.type==='heading'?'h3':'p');p.textContent=block.text;root.append(p);}
  }
  if(!root.childNodes.length)root.append(document.createElement('p'));
  history.current=[root.innerHTML];position.current=0;
  return()=>{urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[];};
 },[]);
 function remember(){
  const s=window.getSelection();
  if(s?.rangeCount&&editor.current.contains(s.anchorNode)&&editor.current.contains(s.focusNode))selection.current=s.getRangeAt(0).cloneRange();
 }
 function range(){
  editor.current.focus();
  let r=selection.current;
  if(!r||!editor.current.contains(r.startContainer)||!editor.current.contains(r.endContainer)){
   r=document.createRange();r.selectNodeContents(editor.current);r.collapse(false);
  }
  const s=window.getSelection();s.removeAllRanges();s.addRange(r);return r;
 }
 function insert(fragment){
  const r=range();r.deleteContents();
  const last=fragment.lastChild;r.insertNode(fragment);
  if(last){r.setStartAfter(last);r.collapse(true);const s=window.getSelection();s.removeAllRanges();s.addRange(r);selection.current=r.cloneRange();}
  checkpoint();
 }
 function addImages(files){
  if(disabled)return;
  const list=Array.from(files||[]);
  if(!list.length)return;
  if(editor.current.querySelectorAll('img').length+list.length>10){report('Maximum 10 detail images.');return;}
  if(list.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>3*1024*1024)){report('Use JPG, PNG or WebP images under 3 MB.');return;}
  const fragment=document.createDocumentFragment();
  for(const file of list){fragment.append(imageNode({type:'image',file,caption:''}));fragment.append(document.createElement('br'));}
  insert(fragment);
 }
 function paste(e){
  e.preventDefault();e.stopPropagation();if(disabled)return;remember();
  const files=Array.from(e.clipboardData.items||[]).filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);
  if(files.length){addImages(files);return;}
  // Plain text keeps copied content readable without importing website scripts/styles.
  const text=e.clipboardData.getData('text/plain');
  if(!text)return;
  const fragment=document.createDocumentFragment();
  text.split(/\r?\n/).forEach((line,i)=>{if(i)fragment.append(document.createElement('br'));fragment.append(document.createTextNode(line));});
  insert(fragment);
 }
 function undo(delta){
  const next=position.current+delta;if(next<0||next>=history.current.length)return;
  position.current=next;editor.current.innerHTML=history.current[next];selection.current=null;emit();range();
 }
 return <section className="kd-document-editor">
  <label id="kd-description-label">PRODUCT DESCRIPTION</label>
  <div className="kd-document-toolbar">
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{remember();picker.current.click();}}>Insert image</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>undo(-1)}>Undo</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>undo(1)}>Redo</button>
   <input ref={picker} type="file" hidden multiple accept="image/png,image/jpeg,image/webp" onChange={e=>{addImages(e.target.files);e.target.value='';}}/>
  </div>
  <div ref={editor} className="kd-document-page" contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-labelledby="kd-description-label"
   data-placeholder="Write product details here. Paste an image with Ctrl+V…"
   onInput={()=>{remember();checkpoint();}} onMouseUp={remember} onKeyUp={remember} onBlur={remember}
   onPaste={paste} onDrop={e=>{e.preventDefault();e.stopPropagation();}}
   onKeyDown={e=>{
    if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();undo(e.key.toLowerCase()==='y'||e.shiftKey?1:-1);}
   }}/>
  <small>Type and paste images in this box. Use Enter for a new line and Backspace/Delete to remove content. Changes are applied with Save.</small>
 </section>;
}
