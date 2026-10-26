import '../../styles/product-details.css';
import React,{useEffect,useRef} from 'react';
import {apiBase,productImageUrl} from '@kd/catalog';
function Preview({block}){
 const ref=useRef(null);
 useEffect(()=>{
  if(!block.file)return;
  const url=URL.createObjectURL(block.file);
  if(ref.current)ref.current.src=url;
  return()=>URL.revokeObjectURL(url);
 },[block.file]);
 return <img ref={ref} src={block.file?undefined:productImageUrl(block.url,import.meta.env.VITE_API_URL||apiBase)} alt={block.caption||'Detail image preview'}/>;
}
export default function ProductDetailsEditor({blocks,onChange,report}){
 const focused=useRef(-1),picker=useRef(null);
 const update=(i,patch)=>onChange(blocks.map((b,j)=>i===j?{...b,...patch}:b));
 function addImages(files){
  const selected=Array.from(files||[]);
  if(!selected.length)return;
  if(blocks.filter(b=>b.type==='image').length+selected.length>10||blocks.length+selected.length>40){report('Maximum 10 detail images and 40 blocks.');return;}
  if(selected.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>3*1024*1024)){report('Use JPG, PNG or WebP images under 3 MB.');return;}
  const index=focused.current<0?blocks.length:Math.min(blocks.length,focused.current+1);
  onChange([...blocks.slice(0,index),...selected.map(file=>({type:'image',file,caption:''})),...blocks.slice(index)]);
  focused.current=index+selected.length-1;
 }
 function paste(event){
  event.stopPropagation();
  const files=Array.from(event.clipboardData?.items||[]).filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
  if(files.length){event.preventDefault();addImages(files);}
 }
 function move(i,delta){
  const next=[...blocks],target=i+delta;
  if(target<0||target>=next.length)return;
  [next[i],next[target]]=[next[target],next[i]];onChange(next);focused.current=target;
 }
 return <section className="kd-details-editor kd-quick-full" aria-label="Product detail editor" onPaste={paste}>
  <header><strong>PRODUCT DETAILS</strong><p>Add paragraphs, headings and images. Click inside this box and paste an image with Ctrl+V, or use Add image. Save applies all changes.</p></header>
  <div className="kd-details-toolbar">
   <button type="button" disabled={blocks.length>=40} onClick={()=>onChange([...blocks,{type:'paragraph',text:''}])}>+ Paragraph</button>
   <button type="button" disabled={blocks.length>=40} onClick={()=>onChange([...blocks,{type:'heading',text:''}])}>+ Heading</button>
   <button type="button" onClick={()=>picker.current?.click()}>+ Image</button>
   <input ref={picker} hidden type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>{addImages(e.target.files);e.target.value='';}}/>
  </div>
  <div className="kd-details-blocks" tabIndex={0} onFocus={e=>{if(e.target===e.currentTarget)focused.current=-1;}} aria-label="Paste detail images here">
   {!blocks.length&&<p>Add a paragraph or paste your first image here.</p>}
   {blocks.map((block,i)=><div className="kd-details-block" key={i} onFocus={()=>{focused.current=i;}}>
    <div className="kd-details-block-actions"><span>{i+1} · {block.type}</span>
     <button type="button" disabled={i===0} aria-label={'Move detail block '+(i+1)+' up'} onClick={()=>move(i,-1)}>↑</button>
     <button type="button" disabled={i===blocks.length-1} aria-label={'Move detail block '+(i+1)+' down'} onClick={()=>move(i,1)}>↓</button>
     <button type="button" aria-label={'Remove detail block '+(i+1)} onClick={()=>onChange(blocks.filter((_,j)=>j!==i))}>Remove</button>
    </div>
    {block.type==='image'?<><Preview block={block}/><input aria-label={'Caption for detail image '+(i+1)} placeholder="Image caption (optional)" maxLength={300} value={block.caption||''} onChange={e=>update(i,{caption:e.target.value})}/></>:
     <textarea className={block.type==='heading'?'is-heading':''} rows={block.type==='heading'?2:4} aria-label={'Detail '+block.type+' '+(i+1)} placeholder={block.type==='heading'?'e.g. Materials & care':'Write product details…'} value={block.text} onChange={e=>update(i,{text:e.target.value})}/>}
   </div>)}
  </div>
  <small>{blocks.filter(b=>b.type==='image').length}/10 images · {blocks.reduce((n,b)=>n+(b.text?.length||0),0)}/12000 characters</small>
 </section>;
}
