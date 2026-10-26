import React from 'react';
import {apiBase,productImageUrl} from '@kd/catalog';
import '../../styles/product-details.css';
export default function ProductDetails({product}){
 const blocks=Array.isArray(product.detail_blocks)?product.detail_blocks:[];
 const specs=[['Brand',product.brand_name],['Category',product.category],['Product type',product.product_type],
  ['Colors',[...new Set((product.variants||[]).map(v=>v.color))].join(', ')],
  ['Sizes',[...new Set((product.variants||[]).map(v=>v.size))].join(', ')]].filter(([,value])=>value);
 return <section className="kd-product-details" aria-labelledby="kd-details-title">
  <header><span>THE DETAILS</span><h2 id="kd-details-title">A closer look</h2><p>Everything to know about {product.name}.</p></header>
  <div className="kd-product-details-layout">
   <article className="kd-details-content">
    <h3>Description</h3>
    {product.description&&<p>{product.description}</p>}
    {blocks.map((block,i)=>block.type==='heading'?<h4 key={i}>{block.text}</h4>:
     block.type==='paragraph'?<p key={i}>{block.text}</p>:
     block.type==='image'&&/^\/media\/products\/[a-f0-9-]+\.(png|jpg|webp)$/i.test(block.url||'')?<figure key={i}><img loading="lazy" src={productImageUrl(block.url,import.meta.env.VITE_API_URL||apiBase)} alt={block.caption||product.name+' detail '+(i+1)}/>{block.caption&&<figcaption>{block.caption}</figcaption>}</figure>:null)}
    {!product.description&&!blocks.length&&<p>Product information will be added soon.</p>}
   </article>
   <aside className="kd-details-specifications"><h3>Product information</h3><dl>{specs.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></aside>
  </div>
 </section>;
}
