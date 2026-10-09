import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {Search,SlidersHorizontal,RotateCcw,ArrowLeft,ArrowRight} from 'lucide-react';
import {filterProducts,paginateProducts} from '@kd/catalog';
import Eyebrow from '../components/common/Eyebrow.jsx';
import {ProductCard} from '../components/product/ProductCard.jsx';
const categories=[['','All categories'],['tops','Tops'],['outerwear','Outerwear'],['bottoms','Bottoms'],['accessories','Accessories']];
const prices=[['','All prices'],['under1500','Under 1.5 million ₫'],['mid','1.5 – 2.5 million ₫'],['over2500','Over 2.5 million ₫']];
const sorts=[['featured','Featured'],['low','Price: Low to high'],['high','Price: High to low'],['name','Name: A to Z']];
export default function ShopPage({products=[],brands=[]}){
 const [params,setParams]=useSearchParams();
 const fields=['q','brand','category','price','size','stock','sort'];
 const filters=Object.fromEntries(fields.map(k=>[k,params.get(k)||'']));
 const choices=[...new Set(products.flatMap(p=>(p.variants||[]).map(v=>v.size)))].filter(Boolean).sort();
 const result=filterProducts(products,brands,filters);
 const page=paginateProducts(result,params.get('page'),8);
 const active=fields.some(k=>filters[k]&&(k!=='sort'||filters[k]!=='featured'));
 function change(key,value){
   setParams(old=>{const next=new URLSearchParams(old);value&&!(key==='sort'&&value==='featured')?next.set(key,value):next.delete(key);next.delete('page');return next;});
 }
 function choosePage(n){setParams(old=>{const next=new URLSearchParams(old);next.set('page',String(n));return next;});window.scrollTo({top:0,behavior:'smooth'});}
 const select=(label,key,options)=><label>{label}<select value={filters[key]||''} onChange={e=>change(key,e.target.value)}>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>;
 return <><section className="page-intro"><Eyebrow>CURATED / PREMIUM FASHION</Eyebrow><h1>The <em>collection.</em></h1><p>Discover contemporary clothing and accessories. Explore by brand, size, budget and availability.</p></section>
 <section className="shop-content kd-shop" aria-label="Shop catalog">
  <div className="kd-toolbar"><div><SlidersHorizontal size={18}/><strong>EXPLORE THE EDIT</strong><span>{result.length} products</span></div>{active&&<button className="kd-clear" type="button" onClick={()=>setParams({})}><RotateCcw size={14}/> CLEAR FILTERS</button>}</div>
  <div className="kd-filters">
    <label className="kd-search">SEARCH<div><Search size={16}/><input aria-label="Search products" placeholder="Search products and brands..." value={filters.q} onChange={e=>change('q',e.target.value)}/></div></label>
    {select('BRAND','brand',[['','All brands'],...brands.map(b=>[b.slug,b.name])])}
    {select('CATEGORY','category',categories)}
    {select('PRICE RANGE','price',prices)}
    {select('SIZE','size',[['','All sizes'],...choices.map(v=>[v,v])])}
    {select('SORT BY','sort',sorts)}
  </div>
  <label className="kd-stock"><input type="checkbox" checked={filters.stock==='available'} onChange={e=>change('stock',e.target.checked?'available':'')}/> Only in-stock items</label>
  {result.length?<div className="products-grid">{page.items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:
    <div className="kd-empty"><Search size={26}/><h2>No matching products</h2><p>Try another brand, size or price range.</p><button className="button button-dark" type="button" onClick={()=>setParams({})}>RESET FILTERS</button></div>}
  {result.length>0&&<div className="kd-page-footer"><span>Showing {(page.page-1)*8+1}–{Math.min(page.page*8,page.total)} of {page.total}</span>
    {page.totalPages>1&&<nav className="kd-pagination" aria-label="Catalog pages"><button disabled={page.page===1} onClick={()=>choosePage(page.page-1)}><ArrowLeft size={14}/> Previous</button><span>{page.page} / {page.totalPages}</span><button disabled={page.page===page.totalPages} onClick={()=>choosePage(page.page+1)}>Next <ArrowRight size={14}/></button></nav>}
  </div>}
  <p className="kd-catalog-note">Demo collection with fictional labels, not merchandise from verified international brand partners.</p>
 </section></>;
}
