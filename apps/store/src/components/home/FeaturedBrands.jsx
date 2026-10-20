import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
import BrandCard from '../brand/BrandCard.jsx';

export default function FeaturedBrands({brands=[]}){
 return <Reveal as="section" className="kd26-section kd26-brands kd-brand-featured" amount={.05}>
  <div className="kd26-section-head">
   <div><h2>Brands worth <em>discovering.</em></h2></div>
   <Link to="/brands" className="kd26-link">Explore all brands <ArrowUpRight size={19}/></Link>
  </div>
  {brands.length?<div className="kd-brand-featured-grid">
   {brands.slice(0,5).map(brand=><BrandCard key={brand.id||brand.slug} brand={brand} compact/>)}
  </div>:<div className="kd26-brand-placeholder">Explore new brands as our collection grows.</div>}
 </Reveal>;
}
