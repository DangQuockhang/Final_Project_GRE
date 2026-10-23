import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {Search,ChevronDown,RotateCcw,ArrowLeft,ArrowRight,SlidersHorizontal} from 'lucide-react';
import {filterProducts,paginateProducts} from '@kd/catalog';
import {ProductCard} from '../components/product/ProductCard.jsx';

const categories=[['','All categories'],['accessories','Accessories'],['bags','Bags'],['clothing','Clothing'],['shoes','Shoes']];
const sorts=[['featured','Featured'],['name','Alphabetically, A–Z'],['low','Price: Low to high'],['high','Price: High to low']];
const priceBands=[['','Any price'],['under1500','Under 1.5 million ₫'],['mid','1.5 – 2.5 million ₫'],['over2500','Over 2.5 million ₫']];
export default function ShopPage({products=[],brands=[],collections=[]}){
 const [params,setParams]=useSearchParams();
 const fields=['q','brand','category','type','price','stock','sale','sort'];
 const f=Object.fromEntries(fields.map(key=>[key,params.get(key)||'']));
 const results=filterProducts(products,brands,f);
 const page=paginateProducts(results,params.get('page'),10);
 const selectedBrand=brands.find(b=>b.slug===f.brand);
 const types=[...new Set(collections.filter(c=>!c.hidden&&Number(c.active_count)>0&&(!f.category||c.category===f.category)).map(c=>c.name))].sort();
 const active=fields.filter(key=>f[key]&&!(key==='sort'&&f[key]==='featured'));
 const title=selectedBrand?.name||(f.sale==='1'?'SALE EDIT':f.category?categories.find(([id])=>id===f.category)?.[1]?.toUpperCase():null)||'ALL PRODUCTS';
 const change=(field,value)=>setParams(old=>{const next=new URLSearchParams(old);if(value&&!(field==='sort'&&value==='featured'))next.set(field,value);else next.delete(field);next.delete('page');next.delete('size');return next;});
 function pageTo(n){setParams(old=>{const next=new URLSearchParams(old);next.set('page',String(n));return next;});window.scrollTo({top:0,behavior:'smooth'});}
 const select=(label,field,options)=><label className="kd-retail-filter-item"><span>{label} <ChevronDown size={14}/></span><select aria-label={'Filter '+label} value={f[field]} onChange={e=>change(field,e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
 return <section className="kd-retail-shop">
   <div className="kd-retail-path">HOME / SHOP {selectedBrand?' / '+selectedBrand.name:''}</div>
   <div className="kd-retail-shop-heading"><div><h1>{title}</h1><p>Discover contemporary styles across our curated multi-brand collection.</p></div><span>{results.length} PRODUCTS</span></div>
   <div className="kd-retail-filterbar"><div className="kd-retail-filter-left">
    <span className="kd-retail-filter-heading"><SlidersHorizontal size={17}/> FILTER</span>
    {select('Brand','brand',[['','All brands'],...brands.map(b=>[b.slug,b.name])])}
    {select('Collection','category',categories)}
    {select('Product type','type',[['','All types'],...types.map(t=>[t,t])])}
    {select('Availability','stock',[['','All products'],['available','In stock'],['soldout','Sold out']])}
    {select('Price','price',priceBands)}
    <label className="kd-retail-sale-filter"><input type="checkbox" checked={f.sale==='1'} onChange={e=>change('sale',e.target.checked?'1':'')}/> On sale</label>
   </div><div className="kd-retail-filter-right">{select('Sort by','sort',sorts)}<span>{results.length} products</span></div></div>
   <div className="kd-retail-chips">
    {active.map(key=><button type="button" className="kd-retail-chip" key={key} onClick={()=>change(key,'')}>{key.toUpperCase()}: {key==='brand'?(selectedBrand?.name||f[key]):f[key]} ×</button>)}
    {active.length>0?<button className="kd-retail-clear" onClick={()=>setParams({})}>Remove all <RotateCcw size={15}/></button>:<span className="kd-retail-filter-hint">Explore the collection using the filters above.</span>}
   </div>
   {results.length?<div className="kd-retail-five-grid">{page.items.map(p=><ProductCard product={p} key={p.id}/>)}</div>:
    <div className="kd-retail-empty"><Search size={32}/><h2>No matching products</h2><p>Try another category, brand or price range.</p><button className="button button-dark" onClick={()=>setParams({})}>CLEAR FILTERS</button></div>}
   {page.totalPages>1&&<nav className="kd-retail-pagination" aria-label="Catalog pages">
    <button disabled={page.page===1} onClick={()=>pageTo(page.page-1)} aria-label="Previous page"><ArrowLeft size={19}/></button>
    {Array.from({length:page.totalPages},(_,i)=><button className={page.page===i+1?'active':''} aria-current={page.page===i+1?'page':undefined} key={i} onClick={()=>pageTo(i+1)}>{i+1}</button>)}
    <button disabled={page.page===page.totalPages} onClick={()=>pageTo(page.page+1)} aria-label="Next page"><ArrowRight size={19}/></button>
   </nav>}
   <p className="kd-retail-results">{page.total?'Showing '+((page.page-1)*10+1)+'–'+Math.min(page.page*10,page.total)+' of '+page.total:''} · KD DESIGN educational multi-brand concept.</p>
 </section>;
}
