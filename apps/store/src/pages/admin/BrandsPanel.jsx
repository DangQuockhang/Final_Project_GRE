import React,{useState} from 'react';
import {Pencil,Trash2,X} from 'lucide-react';
import {validateBrand} from '../../utils/adminValidation.js';
const EMPTY={name:'',description:''};
export default function BrandsPanel({brands,products,api,perform,busy,report}){
  const [editing,setEditing]=useState(null);
  const [draft,setDraft]=useState({...EMPTY});
  function reset(){setEditing(null);setDraft({...EMPTY});}
  function begin(brand){setEditing(brand.id);setDraft({name:brand.name,description:brand.description||''});window.scrollTo({top:0,behavior:'smooth'});}
  async function submit(e){
    e.preventDefault();
    const problem=validateBrand(draft);if(problem){report(problem);return;}
    const ok=await perform(()=>api(editing?'/brands/'+editing:'/brands',{
      method:editing?'PATCH':'POST',body:draft
    }),editing?'Brand updated.':'Brand created.');
    if(ok)reset();
  }
  async function remove(brand){
    if(products.some(p=>String(p.brand_id)===String(brand.id))){report('Brand still has products. Archive or reassign them before deleting.');return;}
    if(!window.confirm('Delete brand "'+brand.name+'"? This cannot be undone.'))return;
    await perform(()=>api('/brands/'+brand.id,{method:'DELETE'}),'Brand deleted.');
  }
  return <section className="kd-admin-panel" aria-labelledby="brand-title">
    <div className="kd-admin-panel-header"><div><h2 id="brand-title">Brand Management</h2><p>Create, update and remove demo brands. Existing brand slugs remain stable when renamed.</p></div><span>{brands.length} brands</span></div>
    <form className="kd-admin-editor" onSubmit={submit}>
      <div className="kd-admin-editor-heading"><strong>{editing?'EDIT BRAND':'ADD NEW BRAND'}</strong>{editing&&<button type="button" onClick={reset}><X size={15}/> Cancel edit</button>}</div>
      <div className="kd-admin-fields">
        <label>BRAND NAME<input required minLength={2} maxLength={120} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} placeholder="Example: ATELIER NORTH"/></label>
        <label>DESCRIPTION<textarea rows={2} maxLength={1000} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))} placeholder="Brand positioning and details"/></label>
      </div>
      <button className="button button-dark" disabled={busy} type="submit">{editing?'SAVE BRAND':'CREATE BRAND'}</button>
    </form>
    <div className="admin-table">{brands.length===0&&<div className="kd-admin-placeholder">No brands yet. Create one above.</div>}
    {brands.map(b=><article key={b.id} className="admin-row kd-admin-record">
      <div><b>{b.name}</b><small>/{b.slug} · {products.filter(p=>String(p.brand_id)===String(b.id)).length} products</small>{b.description&&<p>{b.description}</p>}</div>
      <div className="kd-admin-actions"><button type="button" className="border-button" disabled={busy} onClick={()=>begin(b)}><Pencil size={14}/> EDIT</button><button type="button" className="border-button" disabled={busy} onClick={()=>remove(b)}><Trash2 size={14}/> DELETE</button></div>
    </article>)}</div>
  </section>;
}
