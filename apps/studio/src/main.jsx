import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import { TryOnStudio } from '@kd/virtual-fitting';
import {apiBase} from '@kd/catalog';
import './style.css';
import './styles/readability.css';

function App(){
 const [products,setProducts]=useState([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const [slug,setSlug]=useState(new URLSearchParams(location.search).get('product')||'');
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  const timer=setTimeout(()=>controller.abort(),15000);
  setLoading(true);setError(false);
  fetch(`${import.meta.env.VITE_API_URL||apiBase}/products`,{signal:controller.signal})
   .then(r=>{if(!r.ok)throw Error();return r.json();})
   .then(data=>{if(!Array.isArray(data))throw Error();if(active)setProducts(data);})
   .catch(()=>{if(active){setProducts([]);setError(true);}})
   .finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
  return ()=>{active=false;clearTimeout(timer);controller.abort();};
 },[attempt]);
 const product=products.find(p=>p.slug===slug&&p.tryon_enabled)||products.find(p=>p.tryon_enabled);
 const fitting=products.filter(p=>p.tryon_enabled);
 return <div className="studio-app">
 <header className="studio-header"><a href={import.meta.env.VITE_STORE_URL||'http://localhost:5173'} className="brand">KD<span>DESGIN</span><small>FITTING STUDIO</small></a><nav><a href={import.meta.env.VITE_STORE_URL||'http://localhost:5173'}> Tr? l?i KD Store</a></nav></header>
 <div className="studio-canvas"><div className="intro"><span>NEW EXPERIENCE - 2026</span><div>YOUR BODY. <i>YOUR FIT.</i></div></div>
 {loading?<p role="status">Dang t?i s?n ph?m.</p>:error?<div role="alert"><p>Kh�ng t?i du?c s?n ph?m.</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Th? l?i</button></div>:product?<>
 <div className="products-switch"><span>Ch?n s?n ph?m:</span><select value={product.slug} onChange={e=>setSlug(e.target.value)}>{fitting.map(p=><option key={p.slug} value={p.slug}>{p.name} � {p.brand_name}</option>)}</select></div>
 <TryOnStudio product={product} storeUrl={import.meta.env.VITE_STORE_URL||'http://localhost:5173'}/>
 </>:<p role="status">Chua c� s?n ph?m h? tr? th? d?.</p>}
 <footer>c KD DESGIN - 3D MANNEQUIN DEMONSTRATION � Kh�ng m� ph?ng r? v?i hay d?m b?o size ch�nh x�c.</footer></div>
 </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
