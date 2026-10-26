import React from 'react';
import {apiBase,productImageUrl} from '@kd/catalog';
import '../../styles/product-details.css';
export default function ProductDetails({product}){
 const blocks=Array.isArray(product.detail_blocks)?product.detail_blocks:[];
 if(!product.description&&!blocks.length)return null;
 return <section className="kd-product-description" aria-label="Product description">
  {product.description&&<p>{product.description}</p>}
  {blocks.map((block,i)=>block.type==='heading'?<h3 key={i}>{block.text}</h3>:
   block.type==='paragraph'?<p key={i}>{block.text}</p>:
   block.type==='image'&&/^\/media\/products\/[a-f0-9-]+\.(png|jpg|webp)$/i.test(block.url||'')?
    <figure key={i}><img loading="lazy" src={productImageUrl(block.url,import.meta.env.VITE_API_URL||apiBase)} alt={block.caption||product.name+' detail '+(i+1)}/>{block.caption&&<figcaption>{block.caption}</figcaption>}</figure>:null)}
 </section>;
}
