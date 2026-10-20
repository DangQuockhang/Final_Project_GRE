import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Pencil,Trash2,X,ImagePlus,Save,Search,RotateCcw} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import {validateBrand} from '../../utils/adminValidation.js';
import ImagePasteZone from '../../components/admin/ImagePasteZone.jsx';
import {imageFilesFromClipboard,validateImageFiles} from '../../utils/clipboardImages.js';
import {filterSortBrands} from '../../utils/brandFilters.js';
const EMPTY={name:'',description:''};
const apiImage=value=>productImageUrl(value,import.meta.env.VITE_API_URL||apiBase);

function BrandForm({brand,api,perform,busy,report,onDone}){
 const [draft,setDraft]=useState(()=>brand?{name:brand.name,description:brand.description||''}:{...EMPTY});
 const [file,setFile]=useState(null);
 const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const photo=preview||(brand?.logo_url?apiImage(brand.logo_url):null);
 function choose(input){
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
  e.stopPropagation();
  choose(images);
 }
 async function submit(e){
  e.preventDefault();
  const issue=validateBrand(draft);if(issue){report(issue);return;}
  const saved=await perform(async()=>{
   const result=await api(brand?'/brands/'+brand.id:'/brands',{method:brand?'PATCH':'POST',body:draft});
   if(file){
    const form=new FormData();form.append('image',file);
    await api('/admin/brands/'+result.id+'/logo',{method:'POST',body:form});
   }
  },brand?'Brand updated.':'Brand created.');
  if(saved){setDraft({...EMPTY});setFile(null);onDone?.();}
 }
 async function deletePhoto(){
  if(!brand?.logo_url||!window.confirm('Remove the existing image for '+brand.name+'?'))return;
  const done=await perform(()=>api('/admin/brands/'+brand.id+'/logo',{method:'DELETE'}),'Brand image removed.');
  if(done)setFile(null);
 }
 return <form className="kd-admin-editor kd-brand-editor kd-brand-workspace" onSubmit={submit} onPaste={paste}>
  <div className="kd-admin-editor-heading"><strong>{brand?'EDIT BRAND':'CREATE BRAND'}</strong></div>
  <div className="kd-brand-workspace-fields">
   <label>BRAND NAME<input required minLength={2} maxLength={120} value={draft.name}
    onChange={e=>setDraft(v=>({...v,name:e.target.value}))} placeholder="Brand name"/></label>
   <label>DESCRIPTION<textarea rows={3} maxLength={1000} value={draft.description}
    onChange={e=>setDraft(v=>({...v,description:e.target.value}))} placeholder="Brand story and details"/></label>
   <div className="kd-brand-image-fields">
    <label>BRAND IMAGE / LOGO (JPG, PNG, WEBP)
     <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{choose(e.target.files);e.target.value='';}}/>
    </label>
    <ImagePasteZone label="brand logo" onImages={choose} disabled={busy}/>
    {file&&<button type="button" className="border-button kd-clear-selected-image" onClick={()=>setFile(null)}>CLEAR SELECTED IMAGE</button>}
    <div className="kd-brand-image-preview">{photo?<img src={photo} alt={'Image preview for '+(brand?.name||draft.name)}/>:<div><ImagePlus size={28}/> Add a brand photo</div>}</div>
    {brand?.logo_url&&<button type="button" className="border-button kd-brand-delete-photo" disabled={busy}
     onClick={deletePhoto}><Trash2 size={16}/> REMOVE EXISTING IMAGE</button>}
    <p>Paste a copied image or screenshot, or choose a JPG/PNG/WebP file under 3 MB. The new logo is saved with your brand details.</p>
   </div>
  </div>
  <button type="submit" className="button button-dark kd-brand-save" disabled={busy}><Save size={17}/>{brand?'SAVE BRAND CHANGES':'CREATE BRAND'}</button>
 </form>;
}
function BrandEditDialog({brand,api,perform,busy,report,onClose}){
 const close=useRef(null);
 useEffect(()=>{
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  close.current?.focus();
  const handle=e=>{if(e.key==='Escape'&&!busy)onClose();};
  window.addEventListener('keydown',handle);
  return ()=>{document.body.style.overflow=old;window.removeEventListener('keydown',handle)};
 },[busy,onClose]);
 return createPortal(<div className="kd-edit-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section className="kd-edit-modal kd-brand-modal" role="dialog" aria-modal="true" aria-labelledby="kd-edit-brand-title">
   <div className="kd-edit-modal-header"><div><span>BRAND MANAGEMENT</span><h2 id="kd-edit-brand-title">Edit: {brand.name}</h2></div>
    <button ref={close} type="button" className="kd-edit-modal-close" aria-label="Close brand editor" disabled={busy} onClick={onClose}><X size={23}/></button>
   </div>
   <div className="kd-edit-modal-scroll"><BrandForm key={brand.id} brand={brand} api={api} perform={perform} busy={busy} report={report} onDone={onClose}/></div>
  </section>
 </div>,document.body);
}
export default function BrandsPanel({brands,products,api,perform,busy,report}){
 const [editing,setEditing]=useState(null);
 const [query,setQuery]=useState(''),[sort,setSort]=useState('name-asc');
 const [logoFilter,setLogoFilter]=useState('all'),[productsFilter,setProductsFilter]=useState('all');
 const brand=editing?brands.find(b=>b.id===editing):null;
 const {brands:visibleBrands,countByBrand}=useMemo(()=>filterSortBrands(brands,products,{
  query,sort,logo:logoFilter,productsFilter
 }),[brands,products,query,sort,logoFilter,productsFilter]);
 const hasFilters=Boolean(query.trim()||sort!=='name-asc'||logoFilter!=='all'||productsFilter!=='all');
 const resetFilters=()=>{setQuery('');setSort('name-asc');setLogoFilter('all');setProductsFilter('all');};
 async function remove(b){
  if(products.some(p=>String(p.brand_id)===String(b.id))){report('This brand still has products. Reassign or archive them before deleting.');return;}
  if(!window.confirm('Permanently delete brand "'+b.name+'"?'))return;
  await perform(()=>api('/brands/'+b.id,{method:'DELETE'}),'Brand deleted.');
 }
 return <section className="kd-admin-panel" aria-labelledby="brand-title">
  <div className="kd-admin-panel-header"><div><h2 id="brand-title">Brand Management</h2><p>Create brands and manage images. Edit opens a separate workspace.</p></div><span>{brands.length} brands</span></div>
  <BrandForm brand={null} key="new-brand" api={api} perform={perform} busy={busy} report={report}/>
  <div className="kd-brand-management-toolbar" role="search" aria-label="Search, sort and filter brands">
   <div className="kd-brand-search-field">
    <Search size={19} aria-hidden="true"/>
    <input type="search" aria-label="Search brands" placeholder="Search brand name, slug or description…" value={query} onChange={e=>setQuery(e.target.value)}/>
    {query&&<button type="button" aria-label="Clear brand search" onClick={()=>setQuery('')}><X size={18}/></button>}
   </div>
   <label>SORT BY
    <select aria-label="Sort brands" value={sort} onChange={e=>setSort(e.target.value)}>
     <option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option>
     <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
     <option value="products-desc">Most products</option><option value="products-asc">Fewest products</option>
    </select>
   </label>
   <label>BRAND IMAGE
    <select aria-label="Filter brands by image" value={logoFilter} onChange={e=>setLogoFilter(e.target.value)}>
     <option value="all">All images</option><option value="with">With logo</option><option value="without">Without logo</option>
    </select>
   </label>
   <label>PRODUCTS
    <select aria-label="Filter brands by products" value={productsFilter} onChange={e=>setProductsFilter(e.target.value)}>
     <option value="all">All brands</option><option value="with">With products</option><option value="without">Without products</option>
    </select>
   </label>
   {hasFilters&&<button type="button" className="kd-brand-reset" onClick={resetFilters}><RotateCcw size={16}/> RESET</button>}
  </div>
  <div className="kd-brand-results-info" role="status" aria-live="polite">
   Showing <strong>{visibleBrands.length}</strong> of <strong>{brands.length}</strong> brands
  </div>
  <div className="admin-table">{visibleBrands.length===0&&<div className="kd-admin-placeholder kd-brand-empty">
    <Search size={25}/>
    <strong>{brands.length?'No brands match your search or filters.':'No brands yet.'}</strong>
    <span>{brands.length?'Try a different keyword or reset the filters.':'Create your first brand using the form above.'}</span>
    {brands.length>0&&hasFilters&&<button type="button" className="border-button" onClick={resetFilters}>SHOW ALL BRANDS</button>}
   </div>}
   {visibleBrands.map(b=><article className="admin-row kd-admin-record kd-brand-list-row" key={b.id}>
    <div className="kd-brand-mini-photo">{b.logo_url?<img src={apiImage(b.logo_url)} alt={b.name+' brand image'}/>:<ImagePlus size={25}/>}</div>
    <div className="kd-brand-list-content"><b>{b.name}</b><small>/{b.slug} · {countByBrand.get(String(b.id))||0} products</small>{b.description&&<p>{b.description}</p>}</div>
    <div className="kd-admin-actions"><button type="button" className="border-button" disabled={busy} onClick={()=>setEditing(b.id)}><Pencil size={16}/> EDIT</button>
     <button type="button" className="border-button" disabled={busy} onClick={()=>remove(b)}><Trash2 size={15}/> DELETE</button></div>
   </article>)}
  </div>
  {brand&&<BrandEditDialog brand={brand} api={api} perform={perform} busy={busy} report={report} onClose={()=>setEditing(null)}/>}
 </section>;
}
