import React,{useEffect,useState} from 'react';
import {motion,useReducedMotion} from 'framer-motion';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {money,apiBase,productImageUrl} from '@kd/catalog';

function Visual({product,large=false}){
 const kind=product.category;return <div className={`visual visual-${kind} ${large?'visual-large':''}`} style={{'--product-color':product.color||'#797b73'}} aria-label={`Illustration of ${product.name}`} role="img">
  <div className="visual-glow"/>
  {kind==='accessories'?(product.slug.includes('cap')?<div className="visual-cap"><span/></div>:<div className="visual-bag"><span/></div>):kind==='bottoms'?<div className="visual-pants"><span/><i/></div>:<div className={`visual-shirt ${kind==='outerwear'?'visual-outer':''}`}><span className="visual-shirt-neck"/><span className="visual-shirt-seam"/></div>}
  <span className="visual-label">KD / SAMPLE VISUAL</span>
 </div>
}
function ProductMedia({product,large=false}){
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[product.image_url]);
 const url=productImageUrl(product.image_url,import.meta.env.VITE_API_URL||apiBase);
 if(!url||broken)return <Visual product={product} large={large}/>;
 return <img src={url} alt={product.name} loading={large?'eager':'lazy'} className={'kd-product-photo'+(large?' kd-product-photo-large':'')} onError={()=>setBroken(true)}/>;
}
function ProductCard({product}){
 const reduced=useReducedMotion();
 const count=(product.variants||[]).reduce((n,v)=>n+Number(v.stock||0),0);
 const hasSale=product.sale_price!=null&&Number(product.sale_price)<Number(product.price);
 return <motion.div className="kd-reveal-card" initial={reduced?false:{opacity:0,y:17}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.05}} transition={{duration:reduced?0:.42}}><Link to={'/product/'+product.slug} className="product-card">
  <div className="product-card-photo"><ProductMedia product={product}/>
   {count===0?<span className="kd-retail-card-badge sold">Sold out</span>:hasSale?<span className="kd-retail-card-badge sale">Sale</span>:null}
   <span className="kd26-card-action">View piece <ArrowUpRight size={15}/></span>
  </div>
  <div className="product-card-meta"><div><b>{product.name}</b><small>{product.brand_name}</small></div>
    <span>{hasSale&&<del>{money(product.price)}</del>}{money(hasSale?product.sale_price:product.price)}</span>
  </div></Link></motion.div>;
}
export {Visual,ProductMedia,ProductCard};
