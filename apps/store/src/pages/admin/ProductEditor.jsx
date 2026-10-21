import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ImagePlus,Plus,Trash2,Layers,Save,RotateCcw,ArrowLeft,ArrowRight,Star} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import {PRODUCT_CATEGORIES,PRODUCT_STATUSES,validateProduct} from '../../utils/adminValidation.js';
import {buildVariantMatrix,hasMultipleColors,FALLBACK_HEX} from '../../utils/variantBuilder.js';
import {duplicateProduct} from '../../utils/duplicateProduct.js';
import QuickAddBrand from './QuickAddBrand.jsx';
import ImagePasteZone from '../../components/admin/ImagePasteZone.jsx';
import {appendImages,imageFilesFromClipboard} from '../../utils/clipboardImages.js';
import {moveItem,galleryInOrder} from '../../utils/productPhotoOrder.js';

const shades=[{name:'Black',hex:'#222222'},{name:'Red',hex:'#C33C42'},{name:'Gray',hex:'#898C91'}];
const normal=v=>String(v||'').toLowerCase().trim();
const slug=v=>normal(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const start=(product)=>{
 if(!product)return {name:'',brand_id:'',category:'clothing',product_type:'',price:'',sale_price:'',description:'',status:'draft'};
 return {name:product.name,brand_id:String(product.brand_id),category:product.category,product_type:product.product_type||'',price:String(product.price),sale_price:product.sale_price==null?'':String(product.sale_price),description:product.description||'',status:product.status};
};
const initialColors=p=>{
 if(!p?.variants?.length)return [{...shades[0]}];
 return [...new Map(p.variants.map(v=>[normal(v.color),{name:v.color,hex:v.color_hex||shades.find(s=>normal(s.name)===normal(v.color))?.hex||'#758073'}])).values()];
};
export default function ProductEditor({product,duplicateSource=null,duplicateToken='',brands,api,perform,busy,report,onCancel}){
 const duplicated=useMemo(()=>duplicateSource?duplicateProduct(duplicateSource,duplicateToken):null,[duplicateSource,duplicateToken]);
 const reference=duplicateSource||product;
 const [draft,setDraft]=useState(()=>duplicated?.draft||start(product));
 const [colors,setColors]=useState(()=>initialColors(reference));
 const [multipleColors,setMultipleColors]=useState(()=>hasMultipleColors(reference?.variants));
 const [sizes,setSizes]=useState(()=>duplicated?.sizes||[...new Set((product?.variants||[]).map(v=>v.size))].join(', ')||'ONE SIZE');
 const [rows,setRows]=useState(()=>duplicated?.rows||(product?.variants||[]).map(v=>({...v,stock:String(v.stock),color_hex:v.color_hex||initialColors(product).find(c=>normal(c.name)===normal(v.color))?.hex||'#758073'})));
 const [files,setFiles]=useState([]),[defaultStock,setDefaultStock]=useState('0'),[working,setWorking]=useState(false);
 const [pendingCover,setPendingCover]=useState(null);
 const [galleryIds,setGalleryIds]=useState(()=>(product?.images||[]).map(image=>image.id));
 const [coverGalleryId,setCoverGalleryId]=useState(null);
 useEffect(()=>{
  setGalleryIds((product?.images||[]).map(image=>image.id));
  setCoverGalleryId(null);
 },[product?.images,product?.image_url]);
 const orderedGallery=galleryInOrder(product?.images||[],galleryIds);
 const galleryChanged=galleryIds.some((id,i)=>String(id)!==String(product?.images?.[i]?.id));
 const coverChanged=coverGalleryId!=null&&
  !orderedGallery.some(image=>String(image.id)===String(coverGalleryId)&&image.image_url===product?.image_url);
 const [removedVariants,setRemovedVariants]=useState([]);
 const [quickBrandOpen,setQuickBrandOpen]=useState(false);
 const quickBrandButton=useRef(null);
 const closeQuickBrand=()=>{setQuickBrandOpen(false);quickBrandButton.current?.focus();};
 const limit=Math.min(6,8-(product?.images?.length||0));
 const urls=useMemo(()=>files.map(file=>({name:file.name,url:URL.createObjectURL(file)})),[files]);
 useEffect(()=>()=>urls.forEach(x=>URL.revokeObjectURL(x.url)),[urls]);
 const set=(k,v)=>{
  setDraft(o=>({...o,[k]:v}));
  if(k==='category'&&!product&&!rows.length)setSizes(v==='clothing'?'S, M, L':v==='shoes'?'39, 40, 41, 42':'ONE SIZE');
 };
 function addColor(){
  const next=shades.find(s=>!colors.some(c=>normal(c.name)===normal(s.name)))||{name:'New color',hex:'#758073'};
  setColors(c=>[...c,{...next}]);
 }
 // Stage removals locally; only the Save button updates PostgreSQL.
 // A product can have historical orders, so the API must reject order-linked SKUs.
 function stageRemove(matches,label){
  if(!matches.length)return false;
  const existing=matches.filter(row=>row.id!=null);
  const originalStock=existing.reduce((n,row)=>{
   const old=product?.variants?.find(v=>String(v.id)===String(row.id));
   return n+Number(old?.stock||0);
  },0);
  const unsavedStock=matches.filter(row=>row.id==null).reduce((n,row)=>n+Number(row.stock||0),0);
  const stock=originalStock+unsavedStock;
  const notice=stock>0
   ?'WARNING: '+label+' contains '+stock+' unit(s) of recorded inventory. Deleting will remove those SKU(s) and their stock count. Existing order-linked SKUs cannot be deleted. Queue removal?'
   :'Remove '+label+'? Saved SKUs will only be deleted after you press Save. Order-linked SKUs cannot be deleted.';
  if(!window.confirm(notice))return false;
  const remaining=rows.filter(row=>!matches.includes(row));
  setRows(remaining);
  setRemovedVariants(old=>[...old,...existing.filter(row=>!old.some(prev=>String(prev.id)===String(row.id)))]);
  setColors(old=>{
   const kept=old.filter(color=>!matches.some(r=>normal(r.color)===normal(color.name))||remaining.some(r=>normal(r.color)===normal(color.name)));
   // A previously removed color-chip must reappear if its saved SKU is still present.
   const existing=new Set(kept.map(color=>normal(color.name)));
   for(const row of remaining){
    if(!existing.has(normal(row.color))){
     kept.push({name:row.color,hex:row.color_hex||'#758073'});
     existing.add(normal(row.color));
    }
   }
   return kept;
  });
  return true;
 }
 function removeColor(color){
  const associated=rows.filter(row=>normal(row.color)===normal(color.name));
  if(associated.length){
   stageRemove(associated,'color '+color.name+' and its '+associated.length+' SKU(s)');
  }else if(window.confirm('Remove the unassigned color '+color.name+'?')){
   setColors(old=>old.filter(c=>normal(c.name)!==normal(color.name)));
  }
 }
 function undoRemoval(row){
  setRemovedVariants(old=>old.filter(v=>String(v.id)!==String(row.id)));
  setRows(old=>[...old,row]);
  setColors(old=>old.some(color=>normal(color.name)===normal(row.color))?old:[...old,{name:row.color,hex:row.color_hex||'#758073'}]);
 }
 function setColorMode(checked){
  if(!checked&&hasMultipleColors(rows)){
   report('This product still has more than one SKU color. Remove the unwanted color SKU rows first, then turn off color choices.');
   return;
  }
  if(checked&&!colors.length)setColors([{...shades[0]}]);
  setMultipleColors(checked);
 }
 function buildMatrix(){
  try{
   const generated=buildVariantMatrix({name:draft.name,sizes,colors,rows,defaultStock,multipleColors});
   setRows(generated);
  }catch(error){report(error.message);}
 }
 function choose(filesLike){
  const newFiles=Array.from(filesLike||[]);
  if(!newFiles.length)return;
  const result=appendImages(files,newFiles,{maxCount:Math.max(0,limit)});
  if(result.error){report(result.error);return;}
  setFiles(result.files);
 }
 function movePending(index,direction){setFiles(previous=>moveItem(previous,index,direction));}
 function removePending(index){
  setFiles(previous=>{
   const removed=previous[index];
   if(removed===pendingCover)setPendingCover(null);
   return previous.filter((_,i)=>i!==index);
  });
 }
 async function savePhotoOrder(){
  if(!product)return;
  const ok=await perform(()=>api('/admin/products/'+product.id+'/images/order',{
   method:'PATCH',
   body:{image_ids:galleryIds,...(coverGalleryId!=null?{cover_image_id:coverGalleryId}:{})}
  }),'Gallery order and cover image saved.');
  if(ok)setCoverGalleryId(null);
 }
 async function removeExistingImage(image){
  if(!product||!window.confirm('Remove this product gallery photo?'))return;
  await perform(()=>api('/admin/products/'+product.id+'/images/'+image.id,{method:'DELETE'}),'Gallery photo removed.');
 }
 async function removeCurrentCover(){
  if(!product?.image_url||!window.confirm('Remove the current cover? The earliest gallery image will become the cover when available.'))return;
  await perform(()=>api('/admin/products/'+product.id+'/image',{method:'DELETE'}),'Cover image removed.');
 }
 function paste(e){
  if(quickBrandOpen)return;
  const images=imageFilesFromClipboard(e.clipboardData);
  if(!images.length)return;
  e.preventDefault();
  e.stopPropagation();
  choose(images);
 }
 async function save(e){
  e.preventDefault();
  const data={...draft,color:multipleColors?(colors[0]?.hex||FALLBACK_HEX):(product?.color||FALLBACK_HEX),tryon_enabled:false,
   ...(duplicated?{slug:duplicated.getSlug(draft.name)}:{})};
  const issue=validateProduct(data);
  if(issue){report(issue);return;}
  if(!multipleColors&&hasMultipleColors(rows)){
   report('Remove the unwanted color SKU rows before saving as a product without color choices.');
   return;
  }
  // Newly created one-color/no-color products get an internal SKU automatically.
  // The admin does not have to add a color or press Generate before saving.
  let savingRows=rows;
  if(!product&&!multipleColors&&rows.length===0){
   try{savingRows=buildVariantMatrix({name:draft.name,sizes,rows:[],defaultStock,multipleColors:false});}
   catch(error){report(error.message);return;}
  }
  if(multipleColors&&(colors.length===0||colors.some(c=>!c.name.trim()||!/^#[a-f0-9]{6}$/i.test(c.hex)))){
   report('Select valid color names and swatches, or turn off multiple color options.');
   return;
  }
  if(savingRows.some(r=>!r.sku.trim()||!r.size.trim()||!r.color.trim()||
    (r.color_hex!=null&&r.color_hex!==''&&!/^#[a-f0-9]{6}$/i.test(r.color_hex))||
    !Number.isSafeInteger(Number(r.stock))||Number(r.stock)<0)){
   report('Complete all SKU, size and stock fields.');
   return;
  }
  if(savingRows.length>80){report('Maximum 80 variants.');return;}
  if(files.length>limit){report('Too many photos for this product.');return;}
  const form=new FormData();
  const deletedIds=removedVariants.map(v=>v.id);
  const hasOriginalStock=removedVariants.some(v=>(product?.variants||[]).some(original=>String(original.id)===String(v.id)&&Number(original.stock)>0));
  form.append('payload',JSON.stringify({...data,price:Number(data.price),sale_price:data.sale_price===''?null:Number(data.sale_price),
   variants:savingRows.map(v=>({...v,stock:Number(v.stock)})),deleted_variant_ids:deletedIds,confirm_stock_discard:hasOriginalStock,
   ...(files.includes(pendingCover)?{cover_new_index:files.indexOf(pendingCover)}:{})}));
  files.forEach(f=>form.append('images',f));
  setWorking(true);
  try{
   const ok=await perform(()=>api(product?'/admin/products/'+product.id+'/bundle':'/admin/products/bundle',{method:product?'PATCH':'POST',body:form}),
    product?'Product, sizes and photos updated.':'Product, sizes and photos created.');
   if(ok)onCancel();
  }finally{setWorking(false);}
 }
 const gallery=[...new Set([product?.image_url,...(product?.images||[]).map(i=>i.image_url)].filter(Boolean))];
 return <form onSubmit={save} onPaste={paste} className="kd-quick-editor">
  <div className="kd-quick-title"><div><span>PRODUCT WORKSPACE</span><h3>{product?'Edit '+product.name:duplicated?'Duplicate '+duplicateSource.name:'New product — one step'}</h3>
   <p>{duplicated?'A new independent draft. Details and sizes copied; stock reset to zero, new SKUs assigned. Select new photos before publishing.':'Details, color and size inventory, and photos — save together.'}</p>
  </div>{(product||duplicated)&&<button type="button" className="border-button" onClick={onCancel}><RotateCcw size={16}/> CANCEL {product?'EDIT':'DUPLICATE'}</button>}</div>
  <div className="kd-quick-grid">
   <label>PRODUCT NAME<input required value={draft.name} onChange={e=>set('name',e.target.value)} placeholder="Classic Overshirt"/></label>
   <div className="kd-product-brand-field">
    <label>BRAND<select required value={draft.brand_id} onChange={e=>set('brand_id',e.target.value)}><option value="">Choose a brand</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <button ref={quickBrandButton} type="button" className="border-button kd-quick-add-brand-trigger" disabled={busy||working} onClick={()=>setQuickBrandOpen(true)}><Plus size={17}/> QUICK ADD BRAND</button>
   </div>
   <label>CATEGORY<select value={draft.category} onChange={e=>set('category',e.target.value)}>{PRODUCT_CATEGORIES.map(c=><option value={c} key={c}>{c.toUpperCase()}</option>)}</select></label>
   <label>PRODUCT TYPE<input value={draft.product_type} maxLength={60} onChange={e=>set('product_type',e.target.value)} placeholder="T-Shirt, Jacket, Tote Bag…"/></label>
   <label>PRICE (VND)<input type="number" min="0" required value={draft.price} onChange={e=>set('price',e.target.value)}/></label>
   <label>SALE PRICE (OPTIONAL)<input type="number" min="0" value={draft.sale_price} onChange={e=>set('sale_price',e.target.value)}/></label>
   <label>STATUS<select value={draft.status} onChange={e=>set('status',e.target.value)}>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label>
   <label className="kd-quick-full">DESCRIPTION<textarea rows={3} maxLength={2000} value={draft.description} onChange={e=>set('description',e.target.value)} placeholder="Product details…"/></label>
  </div>
  <section className="kd-quick-step">
   <div className="kd-quick-step-heading">
    <div><h4>1. Sizes & Inventory</h4>
      <p>One-color items can be saved with photos and stock only. Enable color choices for items sold in different colors.</p>
    </div>
   </div>
   <label className="kd-optional-color-switch">
    <input type="checkbox" checked={multipleColors} onChange={e=>setColorMode(e.target.checked)}/>
    <span><strong>Offer multiple color choices</strong><small>Optional — turn on for Black, Red, Gray or other selectable colors.</small></span>
   </label>
   {multipleColors?<div className="kd-optional-color-panel">
    <div className="kd-quick-step-heading">
     <div><h4>Available colors</h4><p>Choose a color name and swatch for each option. Deleting a color also queues its SKUs for removal.</p></div>
     <button type="button" className="border-button" onClick={addColor}><Plus size={15}/> ADD COLOR</button>
    </div>
    <div className="kd-color-admin-grid">{colors.map((color,i)=><div className="kd-color-admin-row" key={i}>
     <input type="color" aria-label={'Color swatch '+(i+1)} value={color.hex} onChange={e=>setColors(old=>old.map((c,j)=>i===j?{...c,hex:e.target.value}:c))}/>
     <input aria-label={'Color name '+(i+1)} value={color.name} onChange={e=>setColors(old=>old.map((c,j)=>i===j?{...c,name:e.target.value}:c))} placeholder="Black"/>
     <button type="button" title={'Delete color '+color.name+' and its associated SKUs'} aria-label={'Delete color '+color.name} onClick={()=>removeColor(color)}><Trash2 size={16}/></button>
    </div>)}</div>
   </div>:<p className="kd-optional-color-hint">No color selection needed. Product images show the item as sold. A standard internal SKU is created automatically for a new product.</p>}
   <div className="kd-size-builder">
    <label>SIZE OPTIONS (COMMA-SEPARATED)<input value={sizes} onChange={e=>setSizes(e.target.value)} placeholder="ONE SIZE or S, M, L"/></label>
    <label>DEFAULT STOCK PER SKU<input type="number" min="0" value={defaultStock} onChange={e=>setDefaultStock(e.target.value)}/></label>
    <button type="button" className="button button-dark" onClick={buildMatrix}><Layers size={16}/>{multipleColors?'GENERATE COLOR × SIZE':'GENERATE SIZE / STOCK'}</button>
   </div>
   {!product&&!multipleColors&&rows.length===0&&<p className="kd-optional-color-hint">You may skip Generate — Save will create the standard SKU using these sizes and stock. Set stock above 0 to make it purchasable.</p>}
   {rows.length>0?<div className={'kd-quick-variants'+(!multipleColors?' is-no-color':'')}>
    <div className="kd-quick-table-head">{multipleColors&&<span>COLOR</span>}<span>SIZE</span><span>SKU</span><span>STOCK</span><span>ACTION</span></div>
    {rows.map((row,i)=><div className="kd-quick-sku-row" key={row.id||i}>
      {multipleColors&&<span><i style={{background:row.color_hex||FALLBACK_HEX}}/>{row.color}</span>}
      <span>{row.size}</span>
      <input aria-label={'SKU '+(i+1)} value={row.sku} maxLength={100} onChange={e=>setRows(old=>old.map((v,j)=>i===j?{...v,sku:e.target.value}:v))}/>
      <input aria-label={'Stock '+(i+1)} type="number" min="0" value={row.stock} onChange={e=>setRows(old=>old.map((v,j)=>i===j?{...v,stock:e.target.value}:v))}/>
      <button className="kd-remove-sku" type="button" aria-label={'Delete SKU '+row.sku} title={'Delete '+row.size} onClick={()=>stageRemove([row],'SKU '+row.sku)}><Trash2 size={18}/><span>DELETE</span></button>
    </div>)}
   </div>:<p className="kd-no-skus">No SKUs in this product yet. Set sizes and stock above, or save a new single-color product to auto-create its SKU.</p>}
   {removedVariants.length>0&&<div className="kd-pending-sku-removals" role="status">
    <strong>{removedVariants.length} SKU(s) queued for deletion</strong>
    <p>No database rows have been removed yet. Click Save to apply; any SKU referenced by an order will be protected.</p>
    <div>{removedVariants.map(v=><div className="kd-pending-sku" key={v.id}><span>{v.color} / {v.size} · {v.sku}</span><button type="button" onClick={()=>undoRemoval(v)}>UNDO</button></div>)}</div>
   </div>}
  </section>
  <section className="kd-quick-step kd-editor-media">
   <div className="kd-quick-step-heading">
    <div><h4>2. Photos & storefront cover</h4>
     <p>Images in File Explorer may not follow your Ctrl-click order. Use the arrows below to set the order explicitly. Choose a cover to display to customers.</p>
    </div>
    <ImagePlus size={27}/>
   </div>
   {product&&<div className="kd-editor-cover-preview">
    {product.image_url?<img src={productImageUrl(product.image_url,import.meta.env.VITE_API_URL||apiBase)} alt={'Current cover for '+product.name}/>:<div><ImagePlus size={26}/> No cover photo</div>}
    <div><strong>CURRENT STOREFRONT COVER</strong><span>This is the image customers see on product cards.</span>
     {product.image_url&&<button type="button" className="border-button" disabled={busy||working} onClick={removeCurrentCover}>REMOVE COVER</button>}
    </div>
   </div>}
   {product&&orderedGallery.length>0&&<>
    <div className="kd-editor-gallery-head"><strong>EXISTING GALLERY — {orderedGallery.length} PHOTOS</strong><span>Arrange from left to right, then save the order.</span></div>
    <div className="kd-editor-gallery-reorder">
     {orderedGallery.map((image,i)=>{
      const isCover=String(coverGalleryId||'')===String(image.id)||(coverGalleryId==null&&product.image_url===image.image_url);
      return <div className={'kd-editor-image-tile'+(isCover?' is-cover':'')} key={image.id}>
       <div className="kd-editor-image-stage"><img src={productImageUrl(image.image_url,import.meta.env.VITE_API_URL||apiBase)} alt={'Gallery photo '+(i+1)}/>
        <span className="kd-editor-image-index">{i+1}</span>{isCover&&<span className="kd-editor-cover-tag"><Star size={13}/> COVER</span>}
       </div>
       <div className="kd-editor-tile-controls">
        <button type="button" title="Move photo left" aria-label={'Move existing photo '+(i+1)+' left'} disabled={busy||working||i===0} onClick={()=>setGalleryIds(prev=>moveItem(prev,i,-1))}><ArrowLeft size={17}/></button>
        <button type="button" title="Move photo right" aria-label={'Move existing photo '+(i+1)+' right'} disabled={busy||working||i===orderedGallery.length-1} onClick={()=>setGalleryIds(prev=>moveItem(prev,i,1))}><ArrowRight size={17}/></button>
        <button type="button" title="Set as main cover" aria-label={'Use existing photo '+(i+1)+' as cover'} disabled={busy||working} onClick={()=>setCoverGalleryId(image.id)}><Star size={17}/></button>
        <button type="button" title="Remove gallery photo" aria-label={'Remove existing photo '+(i+1)} disabled={busy||working} onClick={()=>removeExistingImage(image)}><Trash2 size={17}/></button>
       </div>
      </div>;
     })}
    </div>
    <button className="border-button kd-save-gallery-order" disabled={busy||working||(!galleryChanged&&!coverChanged)} type="button" onClick={savePhotoOrder}><Save size={17}/> SAVE PHOTO ORDER & COVER</button>
    {(galleryChanged||coverChanged)&&<p className="kd-editor-order-unsaved" role="status">Photo order or cover changed. Click SAVE PHOTO ORDER & COVER to apply to the storefront.</p>}
   </>}
   <div className="kd-editor-gallery-head"><strong>{product?'ADD NEW PHOTOS':'NEW PRODUCT PHOTOS'}</strong><span>Maximum {limit} new images, 3 MB per file.</span></div>
   <ImagePasteZone label="product photos" onImages={choose} disabled={busy||working}/>
   <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Select multiple product photos" onChange={e=>{choose(e.target.files);e.target.value='';}}/>
   <p>{files.length} new photo(s) selected · Click Choose Files repeatedly to preserve your chosen sequence, or reorder with the arrows.</p>
   {urls.length>0&&<div className="kd-editor-gallery-reorder">
    {urls.map((x,i)=>{
     const isCover=pendingCover===files[i]||(!product&&!pendingCover&&i===0);
     return <div className={'kd-editor-image-tile'+(isCover?' is-cover':'')} key={x.url}>
      <div className="kd-editor-image-stage"><img src={x.url} alt={x.name||'Selected product photo'}/>
       <span className="kd-editor-image-index">{i+1}</span>{isCover&&<span className="kd-editor-cover-tag"><Star size={13}/> COVER</span>}
      </div>
      <div className="kd-editor-tile-controls">
       <button type="button" title="Move image left" aria-label={'Move new photo '+(i+1)+' left'} disabled={i===0||busy||working} onClick={()=>movePending(i,-1)}><ArrowLeft size={17}/></button>
       <button type="button" title="Move image right" aria-label={'Move new photo '+(i+1)+' right'} disabled={i===files.length-1||busy||working} onClick={()=>movePending(i,1)}><ArrowRight size={17}/></button>
       <button type="button" title="Make cover" aria-label={'Set new photo '+(i+1)+' as cover'} disabled={busy||working} onClick={()=>setPendingCover(files[i])}><Star size={17}/></button>
       <button type="button" title="Remove pending image" aria-label={'Remove new photo '+(i+1)} disabled={busy||working} onClick={()=>removePending(i)}><Trash2 size={17}/></button>
      </div>
     </div>;
    })}
   </div>}
   <p className="kd-editor-media-help">New photos and the selected new cover are saved with SAVE ALL PRODUCT CHANGES. Existing-gallery ordering is saved with SAVE PHOTO ORDER & COVER.</p>
  </section>
  <div className="kd-quick-save"><button className="button button-dark" type="submit" disabled={busy||working||!brands.length}><Save size={18}/>{working?'SAVING…':product?'SAVE ALL PRODUCT CHANGES':duplicated?'CREATE DUPLICATE DRAFT':'CREATE PRODUCT WITH PHOTOS'}</button><span>{duplicated?'This copy is a separate product. All copied sizes start with zero stock; photos are not shared with the original.': 'New products default to Draft. Order-linked SKU history is protected; confirmed unreferenced SKU removals are applied on Save.'}</span></div>
  {quickBrandOpen&&<QuickAddBrand brands={brands} api={api} perform={perform} busy={busy||working} report={report}
   onCreated={id=>set('brand_id',id)} onClose={closeQuickBrand}/>}
 </form>;
}
