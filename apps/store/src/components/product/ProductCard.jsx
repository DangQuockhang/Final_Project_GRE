import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {money,apiBase,productImageUrl} from '@kd/catalog';

function Visual({product,large=false}){
 const kind=product.category;return <div className={`visual visual-${kind} ${large?'visual-large':''}`} style={{'--product-color':product.color||'#797b73'}} aria-label={`Hình minh họa ${product.name}`} role="img">
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
function ProductCard({product}){return <Link to={`/product/${product.slug}`} className="product-card"><div className="product-card-photo"><ProductMedia product={product}/><span className="photo-index">NEW SEASON</span><span className="product-arrow"><ArrowUpRight size={17}/></span></div><div className="product-card-meta"><div><small>{product.brand_name}</small><b>{product.name}</b></div><span>{money(product.price)}</span></div></Link>}
export {Visual,ProductMedia,ProductCard};
