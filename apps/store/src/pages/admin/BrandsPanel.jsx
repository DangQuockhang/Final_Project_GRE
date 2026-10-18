import React,{useEffect,useMemo,useState} from 'react';
import {Pencil,Trash2,X,ImagePlus} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import {validateBrand} from '../../utils/adminValidation.js';
const EMPTY={name:'',description:''};
export default function BrandsPanel({brands,products,api,perform,busy,report}){
 const [editing,setEditing]=useState(null),[draft,setDraft]=useState({...EMPTY}),[file,setFile]=useState(null);
 const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const active=brands.find(b=>b.id===editing);
 function reset(){setEditing(null);setDraft({...EMPTY});setFile(null);}
 function begin(brand){setEditing(brand.id);setDraft({name:brand.name,description:brand.description||''});setFile(null);window.scrollTo({top:0,behavior:'smooth'});}
 function choose(files){
  const candidate=files?.[0];
  if(!candidate){setFile(null);return;}
  if(!['image/jpeg','image/png','image/webp'].includes(candidate.type)||candidate.size>3*1024*1024){report('Brand image must be a JPG, PNG or WebP under 3 MB.');return;}
  setFile(candidate);
 }
 async function submit(e){
  e.preventDefault();
  const problem=validateBrand(draft);if(problem){report(problem);return;}
  const ok=await perform(async()=>{
   const brand=await api(editing?'/brands/'+editing:'/brands',{method:editing?'PATCH':'POST',body:draft});
   if(file){const form=new FormData();form.append('image',file);await api('/admin/brands/'+brand.id+'/logo',{method:'POST',body:form});}
  },editing?'Brand and image updated.':'Brand created with its image.');
  if(ok)reset();
 }
 async function remove(brand){
  if(products.some(p=>String(p.brand_id)===String(brand.id))){report('Brand still has products. Archive or reassign them before deleting.');return;}
  if(!window.confirm('Delete brand "'+brand.name+'"? This cannot be undone.'))return;
  await perform(()=>api('/brands/'+brand.id,{method:'DELETE'}),'Brand deleted.');
 }
 async function removeLogo(brand){
  if(!window.confirm('Remove image for '+brand.name+'?'))return;
  await perform(()=>api('/admin/brands/'+brand.id+'/logo',{method:'DELETE'}),'Brand image removed.');
 }
 const src=active?.logo_url?productImageUrl(active.logo_url,import.meta.env.VITE_API_URL||apiBase):null;
 return <section className="kd-admin-panel" aria-labelledby="brand-title">
  <div className="kd-admin-panel-header"><div><h2 id="brand-title">Brand Management</h2><p>Manage brand names, descriptions and images. Images appear in the storefront.</p></div><span>{brands.length} brands</span></div>
  <form className="kd-admin-editor kd-brand-editor" onSubmit={submit}>
   <div className="kd-admin-editor-heading"><strong>{editing?'EDIT BRAND':'ADD NEW BRAND'}</strong>{editing&&<button type="button" onClick={reset}><X size={15}/> Cancel edit</button>}</div>
   <div className="kd-admin-fields">
    <label>BRAND NAME<input required minLength={2} maxLength={120} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} placeholder="Example: ATELIER NORTH"/></label>
    <label>DESCRIPTION<textarea rows={2} maxLength={1000} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))} placeholder="Brand positioning and details"/></label>
    <label>BRAND IMAGE / LOGO (JPG, PNG, WEBP)
     <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choose(e.target.files)}/>
    </label>
    <div className="kd-brand-preview">{(preview||src)?<img src={preview||src} alt="Brand image preview"/>:<div><ImagePlus size={28}/> No brand image selected</div>}</div>
   </div>
   <button className="button button-dark" disabled={busy} type="submit">{editing?'SAVE BRAND & IMAGE':'CREATE BRAND & IMAGE'}</button>
  </form>
  <div className="admin-table">{brands.length===0&&<div className="kd-admin-placeholder">No brands yet. Create one above.</div>}
   {brands.map(b=><article key={b.id} className="admin-row kd-admin-record kd-brand-list-row">
    <div className="kd-brand-mini-photo">{b.logo_url?<img src={productImageUrl(b.logo_url,import.meta.env.VITE_API_URL||apiBase)} alt={b.name+' image'}/>:<ImagePlus size={25}/>}</div>
    <div className="kd-brand-list-content"><b>{b.name}</b><small>/{b.slug} · {products.filter(p=>String(p.brand_id)===String(b.id)).length} products</small>{b.description&&<p>{b.description}</p>}</div>
    <div className="kd-admin-actions"><button type="button" className="border-button" disabled={busy} onClick={()=>begin(b)}><Pencil size={14}/> EDIT</button>{b.logo_url&&<button type="button" className="border-button" disabled={busy} onClick={()=>removeLogo(b)}><Trash2 size={14}/> REMOVE IMAGE</button>}<button type="button" className="border-button" disabled={busy} onClick={()=>remove(b)}><Trash2 size={14}/> DELETE</button></div>
   </article>)}
  </div>
 </section>;
}
