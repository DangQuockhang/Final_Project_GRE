import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function FeaturedProducts({products=[]}){
 return <Reveal as="section" className="kd-section kd-featured" amount={.06}>
  <div className="kd-section-head">
   <div><span className="kd-kicker"><span/> HANDPICKED FOR YOU</span><h2>Discover the <em>edit.</em></h2></div>
   <Link className="kd-link" to="/shop">View all pieces <ArrowUpRight size={19}/></Link>
  </div>
  {products.length?<div className="products-grid kd-product-grid">{products.slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div>:
   <div className="kd-empty-products"><p>The collection is being curated. Explore all available styles in the shop.</p><Link className="kd-btn kd-btn-dark" to="/shop">Browse the shop <ArrowUpRight size={18}/></Link></div>}
 </Reveal>;
}
