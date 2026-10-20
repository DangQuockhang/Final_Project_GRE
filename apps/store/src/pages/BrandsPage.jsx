import React,{useMemo,useState} from 'react';
import {Search,X} from 'lucide-react';
import BrandCard from '../components/brand/BrandCard.jsx';

export default function BrandsPage({brands=[]}){
 const [query,setQuery]=useState('');
 const sorted=useMemo(()=>[...brands].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})),[brands]);
 const filtered=useMemo(()=>sorted.filter(b=>b.name.toLowerCase().includes(query.trim().toLowerCase())),[sorted,query]);
 return <div className="kd-brand-directory">
  <section className="kd-brand-directory-intro">
   <div className="kd-brand-directory-heading">
    <h1>Discover <em>the brands.</em></h1>
    <span className="kd-brand-directory-count">{sorted.length} {sorted.length===1?'brand':'brands'}</span>
   </div>
   <div className="kd-brand-directory-tools">
    <label className="kd-brand-directory-search"><Search size={21} aria-hidden="true"/>
     <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a brand…" aria-label="Search brands by name"/>
     {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear brand search"><X size={18}/></button>}
    </label>
    <span className="kd-brand-directory-sort">A – Z</span>
   </div>
  </section>
  <section className="kd-brand-directory-results" aria-label="Browse fashion brands">
   {filtered.length?<div className="kd-brand-directory-grid">
    {filtered.map(brand=><BrandCard key={brand.id||brand.slug} brand={brand}/>)}
   </div>:<div className="kd-brand-directory-empty">
    <h2>{sorted.length?'No matching brands.':'Brands are coming soon.'}</h2>
    {sorted.length>0&&<button type="button" onClick={()=>setQuery('')}>View all brands</button>}
   </div>}
  </section>
 </div>;
}
