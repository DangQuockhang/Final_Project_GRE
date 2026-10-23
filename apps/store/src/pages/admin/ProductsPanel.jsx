import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Pencil,ImagePlus,Trash2,X,CopyPlus,Plus,RotateCcw,Search} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import PermanentDeleteDialog from '../../components/admin/PermanentDeleteDialog.jsx';
import {PRODUCT_STATUSES} from '../../utils/adminValidation.js';
import ProductEditor from './ProductEditor.jsx';
import {filterAdminProducts} from '../../utils/adminProductFilters.js';

function EditProductDialog({product=null,duplicateSource=null,duplicateToken='',brands,collections,api,perform,busy,report,onClose,onDelete}){
 const closeButton=useRef(null);
 useEffect(()=>{
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeButton.current?.focus();
  const escape=e=>{if(e.key==='Escape'&&!busy&&!document.querySelector('.kd-quick-brand-modal'))onClose();};
  window.addEventListener('keydown',escape);
  return ()=>{document.body.style.overflow=oldOverflow;window.removeEventListener('keydown',escape)};
 },[busy,onClose]);
 const canDelete=product&&product.status!=='active'&&!(product.variants||[]).some(v=>Number(v.stock)>0);
 return createPortal(<div className="kd-edit-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section className="kd-edit-modal" role="dialog" aria-modal="true" aria-labelledby="kd-edit-product-title">
   <div className="kd-edit-modal-header">
    <div><span>PRODUCT WORKSPACE</span><h2 id="kd-edit-product-title">{duplicateSource?'Duplicate: '+duplicateSource.name:'Edit: '+product?.name}</h2></div>
    <button ref={closeButton} type="button" className="kd-edit-modal-close" onClick={onClose} disabled={busy} aria-label="Close product editor"><X size={24}/></button>
   </div>
   <div className="kd-edit-modal-scroll">
    <ProductEditor key={product?.id||'duplicate-'+duplicateToken} product={product} duplicateSource={duplicateSource}
     duplicateToken={duplicateToken} brands={brands} collections={collections} api={api} perform={perform} busy={busy} report={report} onCancel={onClose}/>
    {product&&<div className="kd-compact-danger-actions">
     <div><strong>Permanent deletion</strong><p>Only a non-active product with zero remaining SKU stock can be checked for permanent deletion. Past orders are protected.</p></div>
     <button type="button" className="border-button kd-delete-product-button" disabled={busy||!canDelete}
      title={!canDelete?'Archive product and set all stock to zero before deleting':'Check if product is safe to delete'}
      onClick={()=>onDelete(product)}><Trash2 size={17}/> CHECK & DELETE PRODUCT</button>
    </div>}
   </div>
  </section>
 </div>,document.body);
}
export default function ProductsPanel({products,brands,collections,api,perform,busy,report}){
 const [showCreator,setShowCreator]=useState(false);
 const [editing,setEditing]=useState(null);
 const [duplicating,setDuplicating]=useState(null);
 const [search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('all'),[brandFilter,setBrandFilter]=useState('all');
 const [deleting,setDeleting]=useState(null),[deletionCheck,setDeletionCheck]=useState(null),[checkingDelete,setCheckingDelete]=useState(false);
 const rows=filterAdminProducts(products,{search,status:statusFilter,brandId:brandFilter});
 const sortedBrands=[...brands].sort((a,b)=>a.name.localeCompare(b.name,'vi',{sensitivity:'base'}));
 const brandCounts=new Map();
 products.forEach(product=>{
  if(product.brand_id!=null){
   const key=String(product.brand_id);
   brandCounts.set(key,(brandCounts.get(key)||0)+1);
  }
 });
 const filtersActive=Boolean(search.trim()||statusFilter!=='all'||brandFilter!=='all');
 const resetFilters=()=>{setSearch('');setStatusFilter('all');setBrandFilter('all');};
 function reset(){setEditing(null)}
 function begin(p){setEditing(p.id)}
 function beginDuplicate(p){setDuplicating({sourceId:p.id,token:Date.now().toString(36)+Math.random().toString(36).slice(2,8)})}
 async function openDelete(product){
  setEditing(null);setDeleting(product);setDeletionCheck(null);setCheckingDelete(true);
  try{setDeletionCheck(await api('/admin/products/'+product.id+'/delete-check'))}
  catch(error){report(error.message||'Deletion check failed.');setDeleting(null)}
  finally{setCheckingDelete(false)}
 }
 async function confirmPermanentDelete(){
  if(!deleting||!deletionCheck?.eligible)return;
  const id=deleting.id;
  const ok=await perform(()=>api('/admin/products/'+id+'/permanent',{method:'DELETE'}),'Product permanently deleted.');
  if(ok){setEditing(null);setDeleting(null);setDeletionCheck(null)}
  else{
   try{setDeletionCheck(await api('/admin/products/'+id+'/delete-check'))}
   catch{setDeleting(null)}
  }
 }
 return <section className="kd-admin-panel kd-compact-products" aria-labelledby="product-title">
  <div className="kd-admin-panel-header">
   <div><h2 id="product-title">Product & Inventory</h2><p>Browse products here. Open Edit to manage photos, sizes, inventory, status and all product details.</p></div>
   <span>{products.length} products</span>
  </div>
  <div className="kd-compact-create-toggle">
   <button type="button" className="button button-dark" aria-expanded={showCreator} aria-controls="kd-admin-new-product"
    onClick={()=>setShowCreator(old=>!old)}><Plus size={18}/>{showCreator?'CLOSE NEW PRODUCT FORM':'ADD NEW PRODUCT'}</button>
  </div>
  {showCreator&&<div id="kd-admin-new-product" className="kd-compact-create-panel">
   <ProductEditor key="new-product" product={null} brands={brands} collections={collections} api={api} perform={perform} busy={busy} report={report} onCancel={()=>setShowCreator(false)}/>
  </div>}
  <div className="kd-compact-product-toolbar kd-order-management-toolbar">
   <label><Search size={19} aria-hidden="true"/><input type="search" aria-label="Search admin products" placeholder="Search products or brand…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <select aria-label="Filter products by brand" value={brandFilter} onChange={e=>setBrandFilter(e.target.value)}>
    <option value="all">All Brands</option>
    {sortedBrands.map(brand=><option value={String(brand.id)} key={brand.id}>
     {brand.name} ({brandCounts.get(String(brand.id))||0})
    </option>)}
   </select>
   <select aria-label="Filter product status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
    <option value="all">All statuses</option>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
   </select>
   {filtersActive&&<button type="button" className="kd-product-filter-reset" onClick={resetFilters}><RotateCcw size={15}/> RESET</button>}
   <span role="status" aria-live="polite">{rows.length} of {products.length} shown</span>
  </div>
  <div className="kd-compact-product-grid">
   {rows.length===0&&<div className="kd-admin-placeholder kd-product-filter-empty">
    <strong>No products match your filters.</strong>
    <span>Try a different brand, status or search term.</span>
    {filtersActive&&<button className="border-button" type="button" onClick={resetFilters}>SHOW ALL PRODUCTS</button>}
   </div>}
   {rows.map(p=><article className="kd-compact-product-card" key={p.id}>
    <button type="button" className="kd-compact-product-picture" aria-label={'Edit '+p.name}
     onClick={()=>begin(p)}>
     {p.image_url?<img src={productImageUrl(p.image_url,import.meta.env.VITE_API_URL||apiBase)} alt={p.name+' storefront image'}/>:
     <span className="kd-compact-product-no-photo"><ImagePlus size={31}/>No cover image</span>}
    </button>
    <div className="kd-compact-product-information">
     <small>{p.brand_name||'Unbranded'}</small>
     <h3 title={p.name}>{p.name}</h3>
    </div>
    <div className="kd-compact-product-actions">
     <button type="button" className="border-button" disabled={busy} onClick={()=>begin(p)}><Pencil size={16}/> EDIT</button>
     <button type="button" className="border-button" disabled={busy} onClick={()=>beginDuplicate(p)} aria-label={'Duplicate '+p.name} title="Duplicate this product"><CopyPlus size={16}/> DUPLICATE</button>
    </div>
   </article>)}
  </div>
  {editing&&products.some(p=>p.id===editing)&&<EditProductDialog product={products.find(p=>p.id===editing)}
   brands={brands} collections={collections} api={api} perform={perform} busy={busy} report={report} onClose={reset} onDelete={openDelete}/>}
  {duplicating&&products.some(p=>p.id===duplicating.sourceId)&&<EditProductDialog
   duplicateSource={products.find(p=>p.id===duplicating.sourceId)} duplicateToken={duplicating.token}
   brands={brands} collections={collections} api={api} perform={perform} busy={busy} report={report} onClose={()=>setDuplicating(null)}/>}
  {deleting&&<PermanentDeleteDialog product={deleting} check={deletionCheck} checking={checkingDelete} busy={busy}
   onConfirm={confirmPermanentDelete} onClose={()=>{setDeleting(null);setDeletionCheck(null)}}/>}
 </section>;
}
