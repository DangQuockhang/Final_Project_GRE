import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import { TryOnStudio } from '@kd/virtual-fitting';
import {demoProducts,apiBase} from '@kd/catalog';
import './style.css';

function App(){
 const [products,setProducts]=useState(demoProducts);
 const [slug,setSlug]=useState(new URLSearchParams(location.search).get('product')||'essential-sculpt-tee');
 useEffect(()=>{fetch(`${import.meta.env.VITE_API_URL||apiBase}/products`).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(data.length)setProducts(data)}).catch(()=>{});},[]);
 const product=products.find(p=>p.slug===slug)||products.find(p=>p.tryon_enabled)||demoProducts[0];
 const fitting=products.filter(p=>p.tryon_enabled);
 return <div className="studio-app">
 <header className="studio-header"><a href={import.meta.env.VITE_STORE_URL||'http://localhost:5173'} className="brand">KD<span>DESGIN</span><small>FITTING STUDIO</small></a><nav><a href={import.meta.env.VITE_STORE_URL||'http://localhost:5173'}>← Trở lại KD Store</a></nav></header>
 <div className="studio-canvas"><div className="intro"><span>NEW EXPERIENCE — 2026</span><div>YOUR BODY. <i>YOUR FIT.</i></div></div>
 <div className="products-switch"><span>Chọn sản phẩm minh họa:</span><select value={product.slug} onChange={e=>setSlug(e.target.value)}>{fitting.map(p=><option key={p.slug} value={p.slug}>{p.name} · {p.brand_name}</option>)}</select></div>
 <TryOnStudio product={product} storeUrl={import.meta.env.VITE_STORE_URL||'http://localhost:5173'}/>
 <footer>© KD DESGIN — 3D MANNEQUIN DEMONSTRATION · Không mô phỏng rủ vải hay đảm bảo size chính xác.</footer></div>
 </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
