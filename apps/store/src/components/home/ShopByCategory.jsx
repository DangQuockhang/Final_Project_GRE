import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
const categories=[
 {id:'tops',title:'TOPS',subtitle:'TEES & SHIRTS',n:'01'},
 {id:'outerwear',title:'OUTERWEAR',subtitle:'JACKETS & LAYERS',n:'02'},
 {id:'bottoms',title:'BOTTOMS',subtitle:'PANTS & SHORTS',n:'03'},
 {id:'accessories',title:'ACCESSORIES',subtitle:'BAGS & MORE',n:'04'}
];
export default function ShopByCategory(){return <section className="section kd-category-section" aria-label="Shop by category">
 <div className="section-head"><div><Eyebrow>002 / CURATED BY CATEGORY</Eyebrow><h2>Explore your <em>style.</em></h2></div></div>
 <div className="kd-category-grid">{categories.map(c=><Link key={c.id} className={'kd-category-tile kd-cat-'+c.id} to={'/shop?category='+c.id}>
  <small>{c.n} / CATEGORY</small><div><strong>{c.title}</strong><span>{c.subtitle} <ArrowUpRight size={19}/></span></div>
 </Link>)}</div>
 </section>}
