import React,{useEffect,useMemo,useState} from 'react';
import {ImagePlus,Plus,Trash2,Layers,Save,RotateCcw} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import {PRODUCT_CATEGORIES,PRODUCT_STATUSES,validateProduct} from '../../utils/adminValidation.js';

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
export default function ProductEditor({product,brands,api,perform,busy,report,onCancel}){
 const [draft,setDraft]=useState(()=>start(product));
 const [colors,setColors]=useState(()=>initialColors(product));
 const [sizes,setSizes]=useState(()=>[...new Set((product?.variants||[]).map(v=>v.size))].join(', ')||'S, M, L');
 const [rows,setRows]=useState(()=>(product?.variants||[]).map(v=>({...v,stock:String(v.stock),color_hex:v.color_hex||initialColors(product).find(c=>normal(c.name)===normal(v.color))?.hex||'#758073'})));
 const [files,setFiles]=useState([]),[defaultStock,setDefaultStock]=useState('0'),[working,setWorking]=useState(false);
 const limit=Math.min(6,8-(product?.images?.length||0));
 const urls=useMemo(()=>files.map(file=>({name:file.name,url:URL.createObjectURL(file)})),[files]);
 useEffect(()=>()=>urls.forEach(x=>URL.revokeObjectURL(x.url)),[urls]);
 const set=(k,v)=>setDraft(o=>({...o,[k]:v}));
 function addColor(){
  const next=shades.find(s=>!colors.some(c=>normal(c.name)===normal(s.name)))||{name:'New color',hex:'#758073'};
  setColors(c=>[...c,{...next}]);
 }
 function buildMatrix(){
  const parsed=[...new Set(sizes.split(',').map(s=>s.trim()).filter(Boolean))];
  if(!parsed.length||parsed.some(s=>s.length>20)||colors.some(c=>!c.name.trim()||!/^#[a-f0-9]{6}$/i.test(c.hex))){report('Provide valid colors and comma-separated sizes.');return;}
  if(parsed.length*colors.length>80){report('Maximum 80 SKU combinations per product.');return;}
  const stock=Number(defaultStock);
  if(!Number.isSafeInteger(stock)||stock<0){report('Enter a valid default stock.');return;}
  setRows(old=>{
   const generated=colors.flatMap(c=>parsed.map(size=>{
    const matching=old.find(r=>normal(r.color)===normal(c.name)&&normal(r.size)===normal(size));
    return matching?{...matching,color:c.name,color_hex:c.hex}:
     {sku:slug(draft.name||'product')+'-'+slug(c.name)+'-'+slug(size),size,color:c.name,color_hex:c.hex,stock:String(stock)};
   }));
   // Never silently delete existing variants: historical orders may reference them.
   const unselected=old.filter(v=>v.id&&!generated.some(row=>String(row.id)===String(v.id)));
   return [...generated,...unselected];
  });
 }
 function choose(filesLike){
  const chosen=Array.from(filesLike||[]);
  if(chosen.length>limit||chosen.some(f=>f.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type))){report('Choose up to '+limit+' JPG/PNG/WebP photos, each under 3 MB.');return;}
  setFiles(chosen);
 }
 async function save(e){
  e.preventDefault();
  const data={...draft,color:colors[0]?.hex||'#758073',tryon_enabled:false};
  const issue=validateProduct(data);
  if(issue){report(issue);return;}
  if(rows.some(r=>!r.sku.trim()||!r.size.trim()||!r.color.trim()||!/^#[a-f0-9]{6}$/i.test(r.color_hex)||!Number.isSafeInteger(Number(r.stock))||Number(r.stock)<0)){report('Complete all SKU, size, color and stock fields.');return;}
  if(rows.length>80){report('Maximum 80 variants.');return;}
  if(files.length>limit){report('Too many photos for this product.');return;}
  const form=new FormData();
  form.append('payload',JSON.stringify({...data,price:Number(data.price),sale_price:data.sale_price===''?null:Number(data.sale_price),variants:rows.map(v=>({...v,stock:Number(v.stock)}))}));
  files.forEach(f=>form.append('images',f));
  setWorking(true);
  const ok=await perform(()=>api(product?'/admin/products/'+product.id+'/bundle':'/admin/products/bundle',{method:product?'PATCH':'POST',body:form}),product?'Product, colors, sizes and photos updated.':'Product, colors, sizes and photos created.');
  setWorking(false);
  if(ok)onCancel();
 }
 const gallery=[...new Set([product?.image_url,...(product?.images||[]).map(i=>i.image_url)].filter(Boolean))];
 return <form onSubmit={save} className="kd-quick-editor">
  <div className="kd-quick-title"><div><span>PRODUCT WORKSPACE</span><h3>{product?'Edit '+product.name:'New product — one step'}</h3><p>Details, color and size inventory, and photos — save together.</p></div>{product&&<button type="button" className="border-button" onClick={onCancel}><RotateCcw size={16}/> CANCEL EDIT</button>}</div>
  <div className="kd-quick-grid">
   <label>PRODUCT NAME<input required value={draft.name} onChange={e=>set('name',e.target.value)} placeholder="Classic Overshirt"/></label>
   <label>BRAND<select required value={draft.brand_id} onChange={e=>set('brand_id',e.target.value)}><option value="">Choose a brand</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
   <label>CATEGORY<select value={draft.category} onChange={e=>set('category',e.target.value)}>{PRODUCT_CATEGORIES.map(c=><option value={c} key={c}>{c.toUpperCase()}</option>)}</select></label>
   <label>PRODUCT TYPE<input value={draft.product_type} maxLength={60} onChange={e=>set('product_type',e.target.value)} placeholder="T-Shirt, Jacket, Tote Bag…"/></label>
   <label>PRICE (VND)<input type="number" min="0" required value={draft.price} onChange={e=>set('price',e.target.value)}/></label>
   <label>SALE PRICE (OPTIONAL)<input type="number" min="0" value={draft.sale_price} onChange={e=>set('sale_price',e.target.value)}/></label>
   <label>STATUS<select value={draft.status} onChange={e=>set('status',e.target.value)}>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label>
   <label className="kd-quick-full">DESCRIPTION<textarea rows={3} maxLength={2000} value={draft.description} onChange={e=>set('description',e.target.value)} placeholder="Product details…"/></label>
  </div>
  <section className="kd-quick-step">
   <div className="kd-quick-step-heading"><div><h4>1. Available colors</h4><p>Add Black, Red, Gray or custom colors. Each color can have its own sizes and stock.</p></div><button type="button" className="border-button" onClick={addColor}><Plus size={15}/> ADD COLOR</button></div>
   <div className="kd-color-admin-grid">{colors.map((color,i)=><div className="kd-color-admin-row" key={i}>
    <input type="color" aria-label={'Color swatch '+(i+1)} value={color.hex} onChange={e=>setColors(old=>old.map((c,j)=>i===j?{...c,hex:e.target.value}:c))}/>
    <input aria-label={'Color name '+(i+1)} value={color.name} onChange={e=>setColors(old=>old.map((c,j)=>i===j?{...c,name:e.target.value}:c))} placeholder="Black"/>
    <button type="button" title="Remove unsaved color selection" aria-label={'Remove color '+(i+1)} disabled={colors.length===1} onClick={()=>setColors(old=>old.filter((_,j)=>j!==i))}><Trash2 size={16}/></button>
   </div>)}</div>
   <div className="kd-size-builder"><label>SIZE OPTIONS (COMMA-SEPARATED)<input value={sizes} onChange={e=>setSizes(e.target.value)} placeholder="S, M, L, XL"/></label><label>DEFAULT STOCK PER SKU<input type="number" min="0" value={defaultStock} onChange={e=>setDefaultStock(e.target.value)}/></label><button type="button" className="button button-dark" onClick={buildMatrix}><Layers size={16}/> GENERATE COLOR × SIZE</button></div>
   {rows.length>0?<div className="kd-quick-variants"><div className="kd-quick-table-head"><span>COLOR</span><span>SIZE</span><span>SKU</span><span>STOCK</span></div>{rows.map((row,i)=><div className="kd-quick-sku-row" key={row.id||i}>
    <span><i style={{background:row.color_hex}}/>{row.color}</span><span>{row.size}</span>
    <input aria-label={'SKU '+(i+1)} value={row.sku} maxLength={100} onChange={e=>setRows(old=>old.map((v,j)=>i===j?{...v,sku:e.target.value}:v))}/>
    <input aria-label={'Stock '+(i+1)} type="number" min="0" value={row.stock} onChange={e=>setRows(old=>old.map((v,j)=>i===j?{...v,stock:e.target.value}:v))}/>
   </div>)}</div>:<p className="kd-no-skus">Choose colors and sizes, then click Generate to add SKU variants before publishing.</p>}
  </section>
  <section className="kd-quick-step"><div className="kd-quick-step-heading"><div><h4>2. Product photographs</h4><p>Select all product photos before saving. The first uploaded photo becomes the cover.</p></div><ImagePlus size={27}/></div>
   {gallery.length>0&&<div className="kd-quick-photo-thumbs">{gallery.map(u=><img key={u} src={productImageUrl(u,import.meta.env.VITE_API_URL||apiBase)} alt="Existing product photo"/>)}</div>}
   <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Select multiple product photos" onChange={e=>choose(e.target.files)}/>
   <p>{files.length} new photos selected · {Math.max(0,limit)} slots available per save · 3 MB maximum per photo.</p>
   {urls.length>0&&<div className="kd-quick-photo-thumbs">{urls.map(x=><img key={x.url} src={x.url} alt={x.name}/>)}</div>}
  </section>
  <div className="kd-quick-save"><button className="button button-dark" type="submit" disabled={busy||working||!brands.length}><Save size={18}/>{working?'SAVING…':product?'SAVE ALL PRODUCT CHANGES':'CREATE PRODUCT WITH PHOTOS'}</button><span>New products default to Draft. Existing SKU/order history is preserved.</span></div>
 </form>;
}
