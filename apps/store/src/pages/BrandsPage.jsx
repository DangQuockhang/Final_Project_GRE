import React,{useMemo,useState} from 'react';
import {Search,X,RotateCcw} from 'lucide-react';
import BrandCard from '../components/brand/BrandCard.jsx';
import {filterSortBrands} from '../utils/brandFilters.js';

export default function BrandsPage({brands=[],products=[]}){
 const [query,setQuery]=useState(''),[sort,setSort]=useState('name-asc');
 const [logoFilter,setLogoFilter]=useState('all'),[productsFilter,setProductsFilter]=useState('all');
 const filtered=useMemo(()=>filterSortBrands(brands,products,{
  query,sort,logo:logoFilter,productsFilter,activeOnly:true
 }).brands,[brands,products,query,sort,logoFilter,productsFilter]);
 const modified=Boolean(query.trim()||sort!=='name-asc'||logoFilter!=='all'||productsFilter!=='all');
 const reset=()=>{setQuery('');setSort('name-asc');setLogoFilter('all');setProductsFilter('all');};
 return <div className="kd-brand-directory">
  <section className="kd-brand-directory-intro">
   <div className="kd-brand-directory-heading">
    <h1>Discover <em>the brands.</em></h1>
    <span className="kd-brand-directory-count">{brands.length} {brands.length===1?'brand':'brands'}</span>
   </div>
   <div className="kd-brand-directory-tools">
    <label className="kd-brand-directory-search"><Search size={21} aria-hidden="true"/>
     <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a brand…" aria-label="Search brands by name"/>
     {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear brand search"><X size={18}/></button>}
    </label>
    <div className="kd-brand-public-filters" role="group" aria-label="Sort and filter brands">
     <label>SORT BY
      <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort brands">
       <option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option>
       <option value="newest">Newest</option><option value="products-desc">Most products</option>
      </select>
     </label>
     <label>IMAGE
      <select value={logoFilter} onChange={e=>setLogoFilter(e.target.value)} aria-label="Filter brands by image">
       <option value="all">All brands</option><option value="with">With logo</option><option value="without">Without logo</option>
      </select>
     </label>
     <label>PRODUCTS
      <select value={productsFilter} onChange={e=>setProductsFilter(e.target.value)} aria-label="Filter brands by available products">
       <option value="all">All brands</option><option value="with">With products</option><option value="without">Without products</option>
      </select>
     </label>
    </div>
   </div>
   <div className="kd-brand-public-count" role="status" aria-live="polite">
    Showing <strong>{filtered.length}</strong> of <strong>{brands.length}</strong> brands
    {modified&&<button onClick={reset} type="button"><RotateCcw size={15}/> Clear filters</button>}
   </div>
  </section>
  <section className="kd-brand-directory-results" aria-label="Browse fashion brands">
   {filtered.length?<div className="kd-brand-directory-grid">
    {filtered.map(brand=><BrandCard key={brand.id||brand.slug} brand={brand}/>)}
   </div>:<div className="kd-brand-directory-empty">
    <h2>{brands.length?'No matching brands.':'Brands are coming soon.'}</h2>
    {brands.length>0&&<button type="button" onClick={reset}>View all brands</button>}
   </div>}
  </section>
 </div>;
}
