import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
import {editorialImages} from './editorialMedia.js';

const categories=[
 {id:'clothing',name:'Clothing',detail:'Tops, jackets & everyday essentials',image:editorialImages.tops},
 {id:'bags',name:'Bags',detail:'Totes, crossbody bags & more',image:editorialImages.outerwear},
 {id:'shoes',name:'Shoes',detail:'Sneakers, slides & more',image:editorialImages.bottoms},
 {id:'accessories',name:'Accessories',detail:'Finishing touches',image:editorialImages.accessories}
];
export default function ShopByCategory(){
 return <Reveal as="section" className="kd-section kd-categories" amount={.05}>
  <div className="kd-section-head" id="kd-categories">
   <div><span className="kd-kicker"><span/> FIND YOUR LOOK</span><h2>Shop by <em>category.</em></h2></div>
   <p>Find what fits your day, your plans, and your personal style.</p>
  </div>
  <div className="kd-category-grid">
   {categories.map(({id,name,detail,image},i)=><Link className="kd-category" to={'/shop?category='+id} key={id}>
    <div className="kd-category-image">
     <img src={image} alt="" loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.opacity='0'}}/>
     <span className="kd-category-count">0{i+1}</span>
     <span className="kd-category-arrow" aria-hidden="true"><ArrowUpRight size={20}/></span>
    </div>
    <div className="kd-category-meta"><strong>{name}</strong><span>{detail}</span></div>
   </Link>)}
  </div>
 </Reveal>;
}
