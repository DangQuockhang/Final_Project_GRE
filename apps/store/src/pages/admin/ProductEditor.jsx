import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ImagePlus,Plus,Trash2,Layers,Save,RotateCcw} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import {PRODUCT_CATEGORIES,PRODUCT_STATUSES,validateProduct} from '../../utils/adminValidation.js';
import {buildVariantMatrix,hasMultipleColors,FALLBACK_HEX} from '../../utils/variantBuilder.js';
import {duplicateProduct} from '../../utils/duplicateProduct.js';
import QuickAddBrand from './QuickAddBrand.jsx';
import ImagePasteZone from '../../components/admin/ImagePasteZone.jsx';
import {appendImages,imageFilesFromClipboard} from '../../utils/clipboardImages.js';

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
   variants:savingRows.map(v=>({...v,stock:Number(v.stock)})),deleted_variant_ids:deletedIds,confirm_stock_discard:hasOriginalStock}));
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
  <section className="kd-quick-step"><div className="kd-quick-step-heading"><div><h4>2. Product photographs</h4><p>Paste screenshots or copied images, drag and drop, or choose image files. The first image is the cover for a new product.</p></div><ImagePlus size={27}/></div>
   {gallery.length>0&&<div className="kd-quick-photo-thumbs">{gallery.map(u=><img key={u} src={productImageUrl(u,import.meta.env.VITE_API_URL||apiBase)} alt="Existing product photo"/>)}</div>}
   <ImagePasteZone label="product photos" onImages={choose} disabled={busy||working}/>
   <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Select multiple product photos" onChange={e=>{choose(e.target.files);e.target.value='';}}/>
   <p>{files.length} new photo(s) selected · {Math.max(0,limit)} slots allowed per save · 3 MB maximum per photo. Pasted photos are uploaded only when you save.</p>
   {urls.length>0&&<div className="kd-quick-photo-thumbs kd-pasted-photo-thumbs">{urls.map((x,i)=><div className="kd-pasted-photo" key={x.url}>
      <img src={x.url} alt={x.name||'Selected product photo'}/>
      <button type="button" className="kd-remove-pasted-image" aria-label={'Remove selected photo '+(i+1)} title="Remove image before saving" onClick={()=>setFiles(previous=>previous.filter((_,j)=>j!==i))}><Trash2 size={15}/></button>
    </div>)}</div>}
  </section>
  <div className="kd-quick-save"><button className="button button-dark" type="submit" disabled={busy||working||!brands.length}><Save size={18}/>{working?'SAVING…':product?'SAVE ALL PRODUCT CHANGES':duplicated?'CREATE DUPLICATE DRAFT':'CREATE PRODUCT WITH PHOTOS'}</button><span>{duplicated?'This copy is a separate product. All copied sizes start with zero stock; photos are not shared with the original.': 'New products default to Draft. Order-linked SKU history is protected; confirmed unreferenced SKU removals are applied on Save.'}</span></div>
  {quickBrandOpen&&<QuickAddBrand brands={brands} api={api} perform={perform} busy={busy||working} report={report}
   onCreated={id=>set('brand_id',id)} onClose={closeQuickBrand}/>}
 </form>;
}
