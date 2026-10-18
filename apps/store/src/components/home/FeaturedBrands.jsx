import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';
import Reveal from '../common/Reveal.jsx';
export default function FeaturedBrands({brands=[]}){
 return <Reveal as="section" className="kd26-section kd26-brands" amount={.05}>
  <div className="kd26-section-head">
   <div><span className="kd26-kicker"><span/> THE LABELS</span><h2>Brands worth <em>discovering.</em></h2></div>
   <Link to="/brands" className="kd26-link">Explore all brands <ArrowUpRight size={19}/></Link>
  </div>
  <div className="kd26-brand-grid">
   {brands.slice(0,3).map((b,i)=><Link to={'/shop?brand='+encodeURIComponent(b.slug)} className="kd26-brand-card" key={b.id}>
    <span className="kd26-brand-index">0{i+1} / SELECTED LABEL</span>
    {b.logo_url&&<img className="kd-brand-public-logo" src={productImageUrl(b.logo_url,import.meta.env.VITE_API_URL||apiBase)} alt={b.name+' logo'}/>}
    <strong>{b.name}</strong>
    <p>{b.description||'Explore the collection and find your next signature piece.'}</p>
    <span className="kd26-brand-foot">Explore collection <ArrowUpRight size={18}/></span>
   </Link>)}
   {!brands.length&&<div className="kd26-brand-placeholder">Explore a growing collection of fashion labels.</div>}
  </div>
  <p className="kd26-demo-note">Curated demo labels. No affiliation with international fashion brands is implied.</p>
 </Reveal>;
}
