import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function FeaturedProducts({products}){return (
<section className="section"><div className="section-head"><div><Eyebrow>001 / THE COLLECTION</Eyebrow><h2>Selected <em>pieces.</em></h2></div><Link className="inline-link" to="/shop">VIEW ALL PRODUCTS <ArrowUpRight size={18}/></Link></div><div className="products-grid">{products.slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
)}
