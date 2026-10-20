import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {apiBase,productImageUrl} from '@kd/catalog';

// Brand logo is sourced from Admin uploads. No synthetic or unrelated
// third-party branded image is substituted when none exists.
export function BrandArtwork({brand}){
 const src=brand?.logo_url?productImageUrl(brand.logo_url,import.meta.env.VITE_API_URL||apiBase):null;
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[src]);
 const monogram=String(brand?.name||'KD').trim().split(/\s+/).map(word=>word[0]||'').join('').slice(0,3).toUpperCase();
 return <div className={'kd-brand-art'+(src&&!broken?' has-photo':' is-initials')}>
  {src&&!broken?<img loading="lazy" decoding="async" src={src} alt={brand.name+' logo'} onError={()=>setBroken(true)}/>:
   <span className="kd-brand-monogram" aria-hidden="true">{monogram}</span>}
 </div>;
}
export default function BrandCard({brand,compact=false}){
 return <Link className={'kd-brand-showcase-card'+(compact?' is-compact':'')} to={'/shop?brand='+encodeURIComponent(brand.slug)}
   aria-label={'Browse '+brand.name+' products'}>
  <BrandArtwork brand={brand}/>
  <div className="kd-brand-showcase-copy">
   <h3>{brand.name}</h3>
   {!compact&&brand.description?.trim()&&<p>{brand.description}</p>}
   <span className="kd-brand-showcase-action">Explore collection <ArrowUpRight size={19}/></span>
  </div>
 </Link>;
}
