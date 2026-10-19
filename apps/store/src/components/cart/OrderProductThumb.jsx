import React from 'react';
import {ProductMedia} from '../product/ProductCard.jsx';

// ProductMedia resolves the real uploaded /media/products image with the same
// fallback as Product Details; never show a generic mannequin for a real photo.
export default function OrderProductThumb({product}){
 return <div className="kd-order-product-thumb">
  {product?<ProductMedia product={product}/>:<span className="kd-order-image-empty">Image unavailable</span>}
 </div>;
}
