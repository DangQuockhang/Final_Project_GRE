import React,{useState} from 'react';
import {Pencil,Archive,RotateCcw,PackagePlus,ImagePlus,Trash2} from 'lucide-react';
import {money,apiBase,productImageUrl} from '@kd/catalog';
import PermanentDeleteDialog from '../../components/admin/PermanentDeleteDialog.jsx';
import {validateVariant,validateStock,PRODUCT_STATUSES} from '../../utils/adminValidation.js';
import ProductEditor from './ProductEditor.jsx';
const NEW_VARIANT={sku:'',size:'',color:'Onyx',stock:'0',chest_cm:''};
export default function ProductsPanel({products,brands,api,perform,busy,report}){
  const [editing,setEditing]=useState(null);
  const [search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('all');
  const [variantDrafts,setVariantDrafts]=useState({}),[stockDrafts,setStockDrafts]=useState({});
  const [pendingImages,setPendingImages]=useState({});
  const [pendingGalleries,setPendingGalleries]=useState({});
  const [deleting,setDeleting]=useState(null);
  const [deletionCheck,setDeletionCheck]=useState(null);
  const [checkingDelete,setCheckingDelete]=useState(false);
  const rows=products.filter(p=>(statusFilter==='all'||p.status===statusFilter)&&[p.name,p.brand_name,p.slug].join(' ').toLowerCase().includes(search.toLowerCase()));
  function reset(){setEditing(null);}
  function begin(p){setEditing(p.id);window.scrollTo({top:0,behavior:'smooth'});}
  async function updateStatus(p,next){
    if(next==='archived'&&!window.confirm('Archive "'+p.name+'"? Existing orders will be retained.'))return;
    await perform(()=>api('/products/'+p.id,{method:'PATCH',body:{status:next}}),'Product status updated.');
  }
  const patchVariant=(id,key,value)=>setVariantDrafts(old=>({...old,[id]:{...NEW_VARIANT,...old[id],[key]:value}}));
  async function addVariant(p){
    const variant={...NEW_VARIANT,...variantDrafts[p.id]};
    const problem=validateVariant(variant);if(problem){report(problem);return;}
    const payload={...variant,stock:Number(variant.stock),chest_cm:variant.chest_cm===''?null:Number(variant.chest_cm)};
    const ok=await perform(()=>api('/products/'+p.id+'/variants',{method:'POST',body:payload}),'Size/color variant created.');
    if(ok)setVariantDrafts(old=>({...old,[p.id]:{...NEW_VARIANT}}));
  }
  async function saveStock(v){
    const stock=stockDrafts[v.id]??String(v.stock);
    const problem=validateStock(stock);if(problem){report(problem);return;}
    const ok=await perform(()=>api('/variants/'+v.id,{method:'PATCH',body:{stock:Number(stock)}}),'Inventory updated.');
    if(ok)setStockDrafts(old=>{const next={...old};delete next[v.id];return next;});
  }
  function choosePhoto(id,file){
    if(!file){setPendingImages(old=>{const next={...old};delete next[id];return next;});return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){report('Select a PNG, JPG or WebP image.');return;}
    if(file.size>3*1024*1024){report('Product photo must be under 3 MB.');return;}
    setPendingImages(old=>({...old,[id]:file}));
  }
  async function uploadPhoto(product){
    const file=pendingImages[product.id];
    if(!file){report('Choose an image before uploading.');return;}
    const form=new FormData();form.append('image',file);
    const ok=await perform(()=>api('/admin/products/'+product.id+'/image',{method:'POST',body:form}),'Product photo uploaded.');
    if(ok)setPendingImages(old=>{const next={...old};delete next[product.id];return next;});
  }
  async function deletePhoto(product){
    if(!window.confirm('Remove the image for '+product.name+'?'))return;
    await perform(()=>api('/admin/products/'+product.id+'/image',{method:'DELETE'}),'Product photo removed.');
  }
  function chooseGallery(id,files){
    const allowed=Array.from(files||[]);
    if(allowed.length>6){report('Upload up to 6 photos at once.');return;}
    if(allowed.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024)){
      report('Choose JPG, PNG or WebP images, each under 3 MB.');return;
    }
    setPendingGalleries(old=>({...old,[id]:allowed}));
  }
  async function uploadGallery(product){
    const files=pendingGalleries[product.id]||[];
    if(!files.length){report('Select images first.');return;}
    const form=new FormData();files.forEach(file=>form.append('images',file));
    const ok=await perform(()=>api('/admin/products/'+product.id+'/images',{method:'POST',body:form}),'Product gallery images added.');
    if(ok)setPendingGalleries(old=>{const next={...old};delete next[product.id];return next;});
  }
  async function deleteGalleryImage(product,image){
    if(!window.confirm('Remove this photo from '+product.name+'?'))return;
    await perform(()=>api('/admin/products/'+product.id+'/images/'+image.id,{method:'DELETE'}),'Gallery photo deleted.');
  }
  async function openDelete(product){
    setDeleting(product);setDeletionCheck(null);setCheckingDelete(true);
    try{setDeletionCheck(await api('/admin/products/'+product.id+'/delete-check'));}
    catch(error){report(error.message||'Deletion check failed.');setDeleting(null);}
    finally{setCheckingDelete(false);}
  }
  async function confirmPermanentDelete(){
    if(!deleting||!deletionCheck?.eligible)return;
    const id=deleting.id;
    const ok=await perform(()=>api('/admin/products/'+id+'/permanent',{method:'DELETE'}),'Product permanently deleted. Other management actions are unchanged.');
    if(ok){
      if(editing===id)reset();
      setPendingImages(old=>{const next={...old};delete next[id];return next;});
      setDeleting(null);setDeletionCheck(null);
    }else{
      // The server validates under row locks even if preflight was eligible.
      try{setDeletionCheck(await api('/admin/products/'+id+'/delete-check'));}
      catch{setDeleting(null);}
    }
  }
  return <section className="kd-admin-panel" aria-labelledby="product-title">
    <div className="kd-admin-panel-header"><div><h2 id="product-title">Product & Inventory</h2><p>Create or edit products with all colors, sizes and images in one workflow. Existing inventory and archive controls stay available.</p></div><span>{products.length} products</span></div>
    <ProductEditor key={editing??'new'} product={editing?products.find(p=>p.id===editing):null} brands={brands}
      api={api} perform={perform} busy={busy} report={report} onCancel={reset}/>
    <div className="kd-admin-filter-row">
      <input aria-label="Search admin products" placeholder="Search products or brand…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select aria-label="Filter product status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select>
    </div>
    <div className="admin-table">{rows.length===0&&<div className="kd-admin-placeholder">No products match the selection.</div>}
      {rows.map(p=><article key={p.id} className="admin-product kd-admin-product">
        <div className="admin-product-head">
          <div><b>{p.name}</b><small>{p.brand_name} · {p.sale_price!=null?<><del>{money(p.price)}</del> {money(p.sale_price)} SALE</>:money(p.price)} · {p.variants?.length||0} SKUs</small></div>
          <div className="kd-admin-actions">
            <span className={'kd-status kd-status-'+p.status}>{p.status.toUpperCase()}</span>
            <select aria-label={'Change status for '+p.name} value={p.status} disabled={busy} onChange={e=>updateStatus(p,e.target.value)}>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select>
            <button className="border-button" type="button" disabled={busy} onClick={()=>begin(p)}><Pencil size={13}/> EDIT</button>
            {p.status!=='archived'&&<button className="border-button" type="button" disabled={busy} onClick={()=>updateStatus(p,'archived')}><Archive size={13}/> ARCHIVE</button>}
            <button className="border-button kd-delete-product-button" type="button"
              disabled={busy||p.status==='active'||(p.variants||[]).some(v=>Number(v.stock)>0)}
              onClick={()=>openDelete(p)}
              title={p.status==='active'?'Archive product before deleting':(p.variants||[]).some(v=>Number(v.stock)>0)?'Set all SKU stock to zero':'Check deletion eligibility'}>
              <Trash2 size={13}/> DELETE
            </button>
          </div>
        </div>
        <div className="kd-admin-image-panel">
          <div className="kd-admin-image-preview">
            {productImageUrl(p.image_url,import.meta.env.VITE_API_URL||apiBase)?
              <img src={productImageUrl(p.image_url,import.meta.env.VITE_API_URL||apiBase)} alt={p.name+' image'}/>:
              <div><ImagePlus size={23}/><small>No photo</small></div>}
          </div>
          <div className="kd-admin-image-controls">
            <strong>PRODUCT PHOTO</strong>
            <p>JPG, PNG or WebP · up to 3 MB. Only upload licensed or original photography.</p>
            {pendingImages[p.id]&&<small className="kd-selected-photo">Selected: {pendingImages[p.id].name} ({Math.round(pendingImages[p.id].size/1024)} KB)</small>}
            <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={'Choose image for '+p.name} onChange={e=>choosePhoto(p.id,e.target.files?.[0])}/>
            <div className="kd-admin-image-actions">
              <button className="border-button" type="button" disabled={busy||!pendingImages[p.id]} onClick={()=>uploadPhoto(p)}><ImagePlus size={14}/> UPLOAD PHOTO</button>
              {p.image_url&&<button className="border-button" type="button" disabled={busy} onClick={()=>deletePhoto(p)}><Trash2 size={14}/> REMOVE PHOTO</button>}
            </div>
          </div>
        </div>
        <div className="kd-retail-gallery-admin">
          <strong>MULTI-IMAGE GALLERY</strong>
          <p>Upload up to 6 JPG/PNG/WebP images per batch, with a limit of 8 extra images per product. Maximum 3 MB each.</p>
          <div className="kd-retail-gallery-thumbs">
            {(p.images||[]).map(image=><div className="kd-retail-gallery-thumb" key={image.id}>
             <img src={productImageUrl(image.image_url,import.meta.env.VITE_API_URL||apiBase)||''} alt={'Gallery image for '+p.name}/>
             <button type="button" className="border-button" disabled={busy} onClick={()=>deleteGalleryImage(p,image)}><Trash2 size={13}/> REMOVE</button>
            </div>)}
            {!p.images?.length&&<p>No gallery photos yet.</p>}
          </div>
          <input aria-label={'Select gallery images for '+p.name} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>chooseGallery(p.id,e.target.files)}/>
          {(pendingGalleries[p.id]||[]).length>0&&<p>{pendingGalleries[p.id].length} photo(s) selected.</p>}
          <button type="button" className="border-button" disabled={busy||!pendingGalleries[p.id]?.length} onClick={()=>uploadGallery(p)}><ImagePlus size={15}/> UPLOAD GALLERY PHOTOS</button>
        </div>
        <div className="kd-variants-table">
          {(p.variants||[]).length===0&&<p className="kd-no-skus">No SKU yet. Add a size/color variant below to enable cart and checkout.</p>}
          {(p.variants||[]).map(v=><div className="kd-stock-row" key={v.id}>
            <div><strong>{v.size} / {v.color}</strong><small>{v.sku}</small></div>
            <label>STOCK<input type="number" min="0" step="1" value={stockDrafts[v.id]??String(v.stock)} onChange={e=>setStockDrafts(old=>({...old,[v.id]:e.target.value}))}/></label>
            <button className="border-button" type="button" disabled={busy} onClick={()=>saveStock(v)}>SAVE STOCK</button>
          </div>)}
        </div>
        <div className="kd-add-variant">
          <span><PackagePlus size={15}/> ADD SKU / SIZE</span>
          <div className="kd-add-variant-grid">
            <input aria-label={'SKU for '+p.name} placeholder="SKU" value={variantDrafts[p.id]?.sku??''} onChange={e=>patchVariant(p.id,'sku',e.target.value)}/>
            <input aria-label={'Size for '+p.name} placeholder="Size (S, M, L…)" value={variantDrafts[p.id]?.size??''} onChange={e=>patchVariant(p.id,'size',e.target.value)}/>
            <input aria-label={'Color for '+p.name} placeholder="Color" value={variantDrafts[p.id]?.color??'Onyx'} onChange={e=>patchVariant(p.id,'color',e.target.value)}/>
            <input aria-label={'Stock for '+p.name} type="number" min="0" step="1" value={variantDrafts[p.id]?.stock??'0'} onChange={e=>patchVariant(p.id,'stock',e.target.value)}/>
            <input aria-label={'Chest cm for '+p.name} type="number" min="0" placeholder="Chest cm (optional)" value={variantDrafts[p.id]?.chest_cm??''} onChange={e=>patchVariant(p.id,'chest_cm',e.target.value)}/>
            <button className="border-button" type="button" disabled={busy} onClick={()=>addVariant(p)}>ADD SKU</button>
          </div>
        </div>
      </article>)}
    </div>
    {deleting&&<PermanentDeleteDialog product={deleting} check={deletionCheck} checking={checkingDelete} busy={busy}
      onConfirm={confirmPermanentDelete} onClose={()=>{setDeleting(null);setDeletionCheck(null);}}/>}
  </section>;
}
