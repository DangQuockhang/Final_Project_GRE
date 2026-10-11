import React,{useState} from 'react';
import {Pencil,Archive,RotateCcw,PackagePlus} from 'lucide-react';
import {money} from '@kd/catalog';
import {validateProduct,validateVariant,validateStock,PRODUCT_CATEGORIES,PRODUCT_STATUSES} from '../../utils/adminValidation.js';
const EMPTY={name:'',brand_id:'',category:'tops',price:'',description:'',color:'#758073',status:'draft',tryon_enabled:false};
const NEW_VARIANT={sku:'',size:'',color:'Onyx',stock:'0',chest_cm:''};
export default function ProductsPanel({products,brands,api,perform,busy,report}){
  const [editing,setEditing]=useState(null);
  const [draft,setDraft]=useState({...EMPTY});
  const [search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('all');
  const [variantDrafts,setVariantDrafts]=useState({}),[stockDrafts,setStockDrafts]=useState({});
  const rows=products.filter(p=>(statusFilter==='all'||p.status===statusFilter)&&[p.name,p.brand_name,p.slug].join(' ').toLowerCase().includes(search.toLowerCase()));
  function update(field,value){setDraft(old=>({...old,[field]:value}));}
  function reset(){setEditing(null);setDraft({...EMPTY});}
  function begin(p){setEditing(p.id);setDraft({name:p.name,brand_id:String(p.brand_id),category:p.category,price:String(p.price),description:p.description||'',color:p.color||'#758073',status:p.status,tryon_enabled:Boolean(p.tryon_enabled)});window.scrollTo({top:0,behavior:'smooth'});}
  async function submit(e){
    e.preventDefault();
    const problem=validateProduct(draft);if(problem){report(problem);return;}
    const payload={...draft,brand_id:Number(draft.brand_id),price:Number(draft.price)};
    const ok=await perform(()=>api(editing?'/products/'+editing:'/products',{method:editing?'PATCH':'POST',body:payload}),editing?'Product updated.':'Product created. Add SKU variants below.');
    if(ok)reset();
  }
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
  return <section className="kd-admin-panel" aria-labelledby="product-title">
    <div className="kd-admin-panel-header"><div><h2 id="product-title">Product & Inventory</h2><p>Control the published catalog, draft products and exact SKU stock levels.</p></div><span>{products.length} products</span></div>
    <form className="kd-admin-editor" onSubmit={submit}>
      <div className="kd-admin-editor-heading"><strong>{editing?'EDIT PRODUCT #'+editing:'CREATE PRODUCT'}</strong>{editing&&<button type="button" onClick={reset}><RotateCcw size={15}/> Cancel edit</button>}</div>
      <div className="kd-admin-fields kd-admin-fields-two">
        <label>PRODUCT NAME<input required minLength={3} value={draft.name} onChange={e=>update('name',e.target.value)} placeholder="Contemporary Overshirt"/></label>
        <label>BRAND<select required value={draft.brand_id} onChange={e=>update('brand_id',e.target.value)}><option value="">Choose brand</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>CATEGORY<select value={draft.category} onChange={e=>update('category',e.target.value)}>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
        <label>PRICE (VND)<input type="number" min="0" step="1" required value={draft.price} onChange={e=>update('price',e.target.value)}/></label>
        <label>STATUS<select value={draft.status} onChange={e=>update('status',e.target.value)}>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label>
        <label>DISPLAY COLOR<input type="color" value={draft.color} onChange={e=>update('color',e.target.value)}/></label>
        <label className="kd-admin-checkbox"><input type="checkbox" checked={draft.tryon_enabled} onChange={e=>update('tryon_enabled',e.target.checked)}/> Enable mannequin demo</label>
        <label className="kd-span-full">DESCRIPTION<textarea rows={3} maxLength={2000} value={draft.description} onChange={e=>update('description',e.target.value)}/></label>
      </div>
      <div className="kd-editor-footer"><button className="button button-dark" disabled={busy||!brands.length} type="submit">{editing?'SAVE CHANGES':'CREATE PRODUCT'}</button><span>New products default to DRAFT. Activate only when ready.</span></div>
    </form>
    <div className="kd-admin-filter-row">
      <input aria-label="Search admin products" placeholder="Search products or brand…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select aria-label="Filter product status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select>
    </div>
    <div className="admin-table">{rows.length===0&&<div className="kd-admin-placeholder">No products match the selection.</div>}
      {rows.map(p=><article key={p.id} className="admin-product kd-admin-product">
        <div className="admin-product-head">
          <div><b>{p.name}</b><small>{p.brand_name} · {money(p.price)} · {p.variants?.length||0} SKUs</small></div>
          <div className="kd-admin-actions">
            <span className={'kd-status kd-status-'+p.status}>{p.status.toUpperCase()}</span>
            <select aria-label={'Change status for '+p.name} value={p.status} disabled={busy} onChange={e=>updateStatus(p,e.target.value)}>{PRODUCT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select>
            <button className="border-button" type="button" disabled={busy} onClick={()=>begin(p)}><Pencil size={13}/> EDIT</button>
            {p.status!=='archived'&&<button className="border-button" type="button" disabled={busy} onClick={()=>updateStatus(p,'archived')}><Archive size={13}/> ARCHIVE</button>}
          </div>
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
  </section>;
}
