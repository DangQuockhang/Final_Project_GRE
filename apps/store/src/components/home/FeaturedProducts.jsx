import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function FeaturedProducts({products=[]}){
 return <Reveal as="section" className="kd26-section kd26-featured" amount={.06}>
  <div className="kd26-section-head">
   <div><span className="kd26-kicker"><span/> HANDPICKED FOR YOU</span><h2>Discover the <em>edit.</em></h2></div>
   <Link className="kd26-link" to="/shop">View all pieces <ArrowUpRight size={19}/></Link>
  </div>
  {products.length?<div className="products-grid kd26-product-grid">{products.slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div>:
   <div className="kd26-empty-products"><p>The collection is being curated. Explore all available styles in the shop.</p><Link className="kd26-btn kd26-btn-dark" to="/shop">Browse the shop <ArrowUpRight size={18}/></Link></div>}
 </Reveal>;
}
