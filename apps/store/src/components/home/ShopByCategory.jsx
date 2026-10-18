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
 return <Reveal as="section" className="kd26-section kd26-categories" amount={.05}>
  <div className="kd26-section-head" id="kd26-categories">
   <div><span className="kd26-kicker"><span/> FIND YOUR LOOK</span><h2>Shop by <em>category.</em></h2></div>
   <p>Find what fits your day, your plans, and your personal style.</p>
  </div>
  <div className="kd26-category-grid">
   {categories.map(({id,name,detail,image},i)=><Link className="kd26-category" to={'/shop?category='+id} key={id}>
    <div className="kd26-category-image">
     <img src={image} alt="" loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.opacity='0'}}/>
     <span className="kd26-category-count">0{i+1}</span>
     <span className="kd26-category-arrow" aria-hidden="true"><ArrowUpRight size={20}/></span>
    </div>
    <div className="kd26-category-meta"><strong>{name}</strong><span>{detail}</span></div>
   </Link>)}
  </div>
 </Reveal>;
}
