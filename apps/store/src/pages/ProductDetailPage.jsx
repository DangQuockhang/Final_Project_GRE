import ProductDetails from '../components/product/ProductDetails.jsx';
import React,{useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ChevronRight,ShoppingBag,ArrowUpRight,ShieldCheck,Truck,Minus,Plus,ArrowLeft,Ruler} from 'lucide-react';
import {money,apiBase,productImageUrl} from '@kd/catalog';
import {ProductCard} from '../components/product/ProductCard.jsx';
import ProductGallery from '../components/product/ProductGallery.jsx';
import {galleryUrls,colorImageUrl} from '../utils/productGallery.js';
import SizeGuideModal from '../components/product/SizeGuideModal.jsx';
const API=import.meta.env.VITE_API_URL||apiBase;

export default function ProductDetailPage({products=[],online=false,loading=false,addToCart,fittingUrl}){
 const {slug}=useParams();
 const [remote,setRemote]=useState(null),[selected,setSelected]=useState(''),[quantity,setQuantity]=useState(1);
 const [fetching,setFetching]=useState(false),[fetchError,setFetchError]=useState(''),[added,setAdded]=useState(false);
 const [sizeGuideOpen,setSizeGuideOpen]=useState(false);
 const [colorChoiceSlug,setColorChoiceSlug]=useState(null);
 const [colorClick,setColorClick]=useState(0);
 const [selectedColor,setSelectedColor]=useState('');
 const item=(remote?.slug===slug?remote:null)||products.find(p=>p.slug===slug);
 const variants=Array.isArray(item?.variants)?item.variants:[];
 const palette=[...new Map(variants.map(v=>[v.color,{name:v.color,hex:v.color_hex||({black:'#222222',red:'#c33c42',gray:'#898c91',grey:'#898c91',onyx:'#333b36'}[String(v.color).toLowerCase()]||item?.color||'#758073')}])).values()];
 const activeColor=palette.some(c=>c.name===selectedColor)?selectedColor:(variants.find(v=>Number(v.stock)>0)?.color||variants[0]?.color||'');
 const showColorChoices=palette.length>1;
 const sizeOptions=variants.filter(v=>v.color===activeColor);
 const noSizeChoice=['accessories','bags'].includes(item?.category)&&sizeOptions.length===1&&['','ONE SIZE'].includes(String(sizeOptions[0].size??'').trim().toUpperCase());
 const variant=sizeOptions.find(v=>String(v.id)===selected)||sizeOptions.find(v=>Number(v.stock)>0)||sizeOptions[0];
 const available=Number(variant?.stock)||0,max=Math.max(0,Math.min(20,available));
 const inStock=sizeOptions.some(v=>Number(v.stock)>0);
 const related=products.filter(p=>p.slug!==slug&&p.category===item?.category&&p.status!=='archived').slice(0,5);
 const hasSale=item?.sale_price!=null&&Number(item.sale_price)<Number(item.price);
 const gallery=galleryUrls(item,url=>productImageUrl(url,API));
 const guideUrl=productImageUrl(item?.size_guide_image_url||item?.brand_size_guide_image_url,API);
 useEffect(()=>{setRemote(null);setSelected('');setSelectedColor('');setQuantity(1);setAdded(false);setSizeGuideOpen(false);},[slug]);
 useEffect(()=>{
  if(!online)return;
  const controller=new AbortController();setFetching(true);setFetchError('');
  fetch(API+'/products/'+encodeURIComponent(slug),{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Cannot load product');return r.json();}).then(setRemote)
   .catch(e=>{if(e.name!=='AbortError')setFetchError('Cannot refresh stock. Please retry later.');})
   .finally(()=>{if(!controller.signal.aborted)setFetching(false);});
  return ()=>controller.abort();
 },[slug,online]);
 useEffect(()=>{setQuantity(q=>Math.max(1,Math.min(q,Math.max(1,max))));},[variant?.id,max]);
 useEffect(()=>{if(!added)return;const t=setTimeout(()=>setAdded(false),2200);return ()=>clearTimeout(t);},[added]);
 if(!item)return <section className="kd-missing"><h1>{loading||fetching?'Loading product…':'Product not found'}</h1><Link to="/shop"><ArrowLeft size={17}/> Back to shop</Link></section>;
 const canBuy=max>0&&!fetching&&!fetchError;
 return <>
  <section className="kd-retail-pdp kd-pdp-refined">
   <div className="kd-retail-breadcrumb"><Link to="/shop">ALL PRODUCTS</Link><ChevronRight size={14}/><Link to={'/shop?brand='+encodeURIComponent(item.brand_slug||'')}>{item.brand_name}</Link><ChevronRight size={14}/><span>{item.name}</span></div>
   <div className="kd-retail-pdp-layout">
    <ProductGallery key={item.slug} product={item} images={gallery} colorImage={colorChoiceSlug===slug?colorImageUrl(item,selectedColor,url=>productImageUrl(url,API)):null} colorClick={colorClick}/>
    <div className="kd-retail-pdp-info">
      <h1>{item.name}</h1><h2 className="kd-retail-brand-title">{item.brand_name}</h2>
      <div className="kd-retail-prices">{hasSale&&<del>{money(item.price)}</del>}<strong>{money(hasSale?item.sale_price:item.price)}</strong>{hasSale&&<span className="kd-retail-promo">Sale</span>}</div>
      <div className="kd-retail-separator"/>
      {showColorChoices&&<>
       <div className="kd-retail-label">COLOR <span style={{fontWeight:400,color:'#748077'}}>· {activeColor||'Not available'}</span></div>
       <div className="kd-retail-color-choices" role="group" aria-label="Choose product color">
        {palette.map(color=><button key={color.name} type="button" className={activeColor===color.name?'is-selected':''}
          onClick={()=>{setSelectedColor(color.name);setColorChoiceSlug(slug);setColorClick(n=>n+1);setSelected('');setQuantity(1);setAdded(false)}} aria-pressed={activeColor===color.name}
          title={color.name} aria-label={'Choose '+color.name+' color'}>
          <i style={{backgroundColor:color.hex}}/><span>{color.name}</span>
        </button>)}
       </div>
      </>}
      {!noSizeChoice&&<>
      <div className="kd-v2-size-header">
       <div className="kd-retail-label">SIZE <span style={{fontWeight:400,color:'#748077'}}>{variant?'· '+variant.size:''}</span></div>
       {guideUrl&&<button type="button" className="kd-v2-size-link" onClick={()=>setSizeGuideOpen(true)}><Ruler size={19}/> Size guide</button>}
      </div>
      <div className="kd-retail-sizes" role="group" aria-label="Select size for chosen color">
       {sizeOptions.map(v=><button type="button" key={v.id} className={String(variant?.id)===String(v.id)?'active':''} aria-pressed={String(variant?.id)===String(v.id)} disabled={Number(v.stock)<=0} title={v.size+' / '+v.color} onClick={()=>{setSelected(String(v.id));setQuantity(1);setAdded(false)}}>{v.size}</button>)}
      </div>
      </>}
      {noSizeChoice&&guideUrl&&<button type="button" className="kd-v2-size-link" onClick={()=>setSizeGuideOpen(true)}><Ruler size={19}/> Size guide</button>}
      <div className="kd-retail-stock" role="status" aria-live="polite"><span className={'kd-retail-stock-dot'+(!inStock?' out':'')}/>{inStock?'In stock':'Out of stock'}{fetching?' · Refreshing stock…':''}</div>
      {fetchError&&<p className="kd-warning" role="alert">{fetchError}</p>}
      <div className="kd-retail-buy-row">
       {canBuy&&<div className="kd-qty-widget">
        <button type="button" aria-label="Decrease quantity" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={16}/></button>
        <input aria-label="Quantity" type="number" min="1" max={max} value={quantity} onChange={e=>setQuantity(Math.min(max,Math.max(1,Number(e.target.value)||1)))}/>
        <button type="button" aria-label="Increase quantity" disabled={quantity>=max} onClick={()=>setQuantity(q=>Math.min(max,q+1))}><Plus size={16}/></button>
       </div>}
       <button type="button" className="button button-dark" disabled={!canBuy} onClick={()=>{addToCart(item,variant,quantity);setAdded(true)}}>{!inStock?'SOLD OUT':added?'ADDED TO BAG ✓':'ADD TO BAG'} <ShoppingBag size={18}/></button>
      </div>
      <ProductDetails product={item}/>
      <div className="pdp-benefits"><div><ShieldCheck size={18}/>Supplier documentation required before real sales</div><div><Truck size={18}/>Select your delivery and available payment method at checkout</div></div>
    </div>
   </div>
  </section>
  {sizeGuideOpen&&guideUrl&&<SizeGuideModal src={guideUrl} name={item.brand_name+' · '+(item.product_type||item.category)} onClose={()=>setSizeGuideOpen(false)}/>}
  {related.length>0&&<section className="section kd-related"><div className="section-head"><div><span className="eyebrow">KEEP EXPLORING</span><h2>You may also <em>like.</em></h2></div><Link to="/shop" className="inline-link">VIEW ALL <ArrowUpRight size={18}/></Link></div><div className="products-grid">{related.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>}
 </>;
}
