import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function FeaturedBrands({brands}){return (
<section className="section brands-home"><div className="section-head"><div><Eyebrow>002 / CURATED LABELS</Eyebrow><h2>Meet the <em>brands.</em></h2></div><Link className="inline-link" to="/brands">EXPLORE ALL <ArrowUpRight size={18}/></Link></div><div className="brand-tiles">{brands.slice(0,3).map((b,i)=><Link to={`/shop?brand=${b.slug}`} className={`brand-tile brand-tile-${i}`} key={b.id}><small>0{i+1} — SELECTED LABEL</small><b>{b.name}</b><p>{b.description}</p><ArrowUpRight size={18}/></Link>)}</div></section>
)}
