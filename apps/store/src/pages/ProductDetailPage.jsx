import React,{useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ChevronRight,ShoppingBag,Sparkles,ArrowUpRight,ShieldCheck,Truck,Minus,Plus,ArrowLeft} from 'lucide-react';
import {money,apiBase} from '@kd/catalog';
import {Visual,ProductCard} from '../components/product/ProductCard.jsx';
import Eyebrow from '../components/common/Eyebrow.jsx';
const API=import.meta.env.VITE_API_URL||apiBase;
function ProductPhoto({item}){
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[item?.image_url]);
 const url=typeof item.image_url==='string'&&/^https?:\/\//i.test(item.image_url)?item.image_url:null;
 return url&&!broken?<img className="kd-photo" src={url} alt={item.name} onError={()=>setBroken(true)}/>:<Visual product={item} large/>;
}
export default function ProductDetailPage({products=[],online=false,loading=false,addToCart,fittingUrl}){
 const {slug}=useParams();
 const [remote,setRemote]=useState(null),[selected,setSelected]=useState(''),[quantity,setQuantity]=useState(1);
 const [fetching,setFetching]=useState(false),[fetchError,setFetchError]=useState(''),[added,setAdded]=useState(false);
 const item=(remote?.slug===slug?remote:null)||products.find(p=>p.slug===slug);
 const variants=Array.isArray(item?.variants)?item.variants:[];
 const variant=variants.find(v=>String(v.id)===selected)||variants.find(v=>Number(v.stock)>0)||variants[0];
 const available=Number(variant?.stock)||0,max=Math.max(0,Math.min(20,available));
 const related=products.filter(p=>p.slug!==slug&&p.category===item?.category&&p.status!=='archived').slice(0,4);
 useEffect(()=>{setRemote(null);setSelected('');setQuantity(1);setAdded(false);},[slug]);
 useEffect(()=>{if(!online)return;const controller=new AbortController();setFetching(true);setFetchError('');
  fetch(API+'/products/'+encodeURIComponent(slug),{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Stock unavailable');return r.json();}).then(setRemote)
    .catch(e=>{if(e.name!=='AbortError')setFetchError('Cannot refresh stock. Please retry later.');})
    .finally(()=>{if(!controller.signal.aborted)setFetching(false);});
  return ()=>controller.abort();},[slug,online]);
 useEffect(()=>{setQuantity(q=>Math.max(1,Math.min(q,Math.max(1,max))));},[variant?.id,max]);
 useEffect(()=>{if(!added)return;const t=setTimeout(()=>setAdded(false),2200);return ()=>clearTimeout(t);},[added]);
 if(!item)return <section className="kd-missing"><h1>{loading||fetching?'Loading product…':'Product not found'}</h1><Link to="/shop"><ArrowLeft size={16}/> Back to shop</Link></section>;
 const canBuy=max>0&&!fetching&&!fetchError;
 return <>
  <div className="crumb kd-crumb"><Link to="/shop">SHOP ALL</Link><ChevronRight size={13}/>{item.brand_name}<ChevronRight size={13}/>{item.name}</div>
  <section className="pdp kd-product">
    <div className="kd-product-gallery"><ProductPhoto item={item}/><div className="kd-caption">{item.image_url?'PRODUCT PREVIEW':'CONCEPT VISUAL — NOT A BRAND PHOTOGRAPH'}</div></div>
    <div className="pdp-details">
      <Eyebrow>{item.brand_name}</Eyebrow><h1>{item.name}</h1><div className="pdp-price">{money(item.price)}</div><p>{item.description}</p>
      <div className="small-divider"/><div className="kd-selection-title"><label className="pdp-label">SIZE / COLOR</label><span>{variant?.size||'N/A'} · {variant?.color||'Default'}</span></div>
      <div className="size-picker kd-variants" role="group" aria-label="Choose size and color">{variants.map(v=><button type="button" key={v.id} disabled={Number(v.stock)<=0} aria-pressed={String(variant?.id)===String(v.id)} className={(String(variant?.id)===String(v.id)?'on ':'')+(Number(v.stock)<=0?'out':'')} onClick={()=>{setSelected(String(v.id));setQuantity(1);setAdded(false);}}><b>{v.size}</b><small>{v.color||'Default'}</small></button>)}</div>
      <div className="inventory-note" aria-live="polite">{available?available+' available'+(!online?' (demo)':''):'Out of stock'}{fetching?' · Refreshing stock…':''}</div>
      {fetchError&&<p className="kd-warning" role="alert">{fetchError}</p>}
      <div className="kd-qty"><label htmlFor="kd-qty-input">QUANTITY</label><div className="kd-qty-widget">
        <button type="button" aria-label="Decrease quantity" disabled={!canBuy||quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={16}/></button>
        <input id="kd-qty-input" type="number" min="1" max={Math.max(1,max)} disabled={!canBuy} value={quantity} onChange={e=>setQuantity(Math.min(Math.max(1,Math.floor(Number(e.target.value)||1)),Math.max(1,max)))}/>
        <button type="button" aria-label="Increase quantity" disabled={!canBuy||quantity>=max} onClick={()=>setQuantity(q=>Math.min(max,q+1))}><Plus size={16}/></button>
      </div><span>Max {max} per selection</span></div>
      <button type="button" className="button button-dark full-width" disabled={!canBuy} onClick={()=>{addToCart(item,variant,quantity);setAdded(true);}}>{added?'ADDED TO BAG ✓':'ADD TO BAG'} <ShoppingBag size={18}/></button>
      {item.tryon_enabled&&<a className="fitting-link" href={fittingUrl+'/?product='+encodeURIComponent(slug)} target="_blank" rel="noreferrer"><Sparkles size={20}/><span><b>TRY ON 3D MANNEQUIN</b><small>Visual preview only; not accurate real-world fit</small></span><ArrowUpRight size={18}/></a>}
      <div className="pdp-benefits"><div><ShieldCheck size={18}/>Supplier documentation required before real sales</div><div><Truck size={18}/>Checkout is a COD demonstration</div></div>
    </div>
  </section>
  {related.length>0&&<section className="section kd-related"><div className="section-head"><div><Eyebrow>KEEP EXPLORING</Eyebrow><h2>You may also <em>like.</em></h2></div><Link to="/shop" className="inline-link">VIEW ALL <ArrowUpRight size={18}/></Link></div><div className="products-grid">{related.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>}
 </>;
}
