import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import ProductGallery from './components/product/ProductGallery.jsx';
import ProductEditor from './pages/admin/ProductEditor.jsx';
import './style.css';
import './styles/admin-phase2.css';
import './styles/product-images.css';
import './styles/admin-workspace.css';
import './styles/product-gallery-v2.css';
import './styles/reno-gallery.css';
import './styles/gallery-demo.css';
const photos=Array.from({length:4},(_,i)=>({id:i+1,image_url:location.origin+'/demo-gallery/look-'+i+'.svg',color:i<2?'Onyx':'Oat'}));
const sample={id:9001,slug:'gallery-demo',name:'Everyday Studio Jacket',brand_id:1,brand_name:'KD STUDIO',category:'clothing',product_type:'Jacket',price:1290000,sale_price:null,status:'draft',description:'A considered everyday layer. Demo illustrations — no real stock.',image_url:photos[0].image_url,images:photos,variants:[{id:1,sku:'DEMO-ONYX-M',size:'M',color:'Onyx',color_hex:'#272a28',stock:5},{id:2,sku:'DEMO-OAT-M',size:'M',color:'Oat',color_hex:'#ddd4bd',stock:5}]};
function Demo(){
 const [tab,setTab]=useState('store'),[layout,setLayout]=useState('left'),[color,setColor]=useState(null),[click,setClick]=useState(0),[message,setMessage]=useState('');
 const [saved,setSaved]=useState(sample),[version,setVersion]=useState(0);
 const images=[...new Set([saved.image_url,...saved.images.map(x=>x.image_url)].filter(Boolean))];
 async function demoApi(path,options){
  if(!path.endsWith('/bundle'))throw new Error('This demo only previews product saves.');
  const payload=JSON.parse(options.body.get('payload'));
  const additions=options.body.getAll('images').map((file,i)=>({id:Date.now()+i,image_url:URL.createObjectURL(file),color:payload.new_image_colors[i]}));
  const kept=payload.image_ids.map(id=>saved.images.find(x=>x.id===id)).filter(Boolean).map(image=>({...image,color:payload.image_colors.find(x=>x.id===image.id)?.color}));
  let cover=payload.cover_new_index!=null?additions[payload.cover_new_index]?.image_url:payload.cover_image_id?kept.find(x=>x.id===payload.cover_image_id)?.image_url:payload.remove_cover?null:saved.image_url;
  if(payload.deleted_image_ids.some(id=>saved.images.find(x=>x.id===id)?.image_url===cover))cover=null;
  const next={...saved,...payload,images:[...kept,...additions],image_url:cover||kept[0]?.image_url||additions[0]?.image_url,description:'',detail_blocks:[]};
  setSaved(next);setColor(null);setVersion(v=>v+1);return next;
 }
 return <div className="kd-demo-shell">
  <header className="kd-demo-header"><a href="/gallery-demo.html" className="kd-demo-logo">KD<span>GALLERY STUDIO</span></a><span className="kd-demo-pill">INTERACTIVE DEMO</span></header>
  <div className="kd-demo-heading"><div><span className="kd-reno-eyebrow">A CLOSER LOOK</span><h1>Every detail matters.</h1><p>Explore the gallery, then step into the photo workspace.</p></div><nav aria-label="Demo view"><button type="button" aria-pressed={tab==='store'} onClick={()=>setTab('store')}>Storefront</button><button type="button" aria-pressed={tab==='admin'} onClick={()=>setTab('admin')}>Admin workspace</button></nav></div>
  {message&&<p role="status" className="kd-demo-notice">{message}</p>}
  {tab==='store'?<div className="kd-demo-product"><ProductGallery product={saved} images={images} layout={layout} colorImage={saved.images.find(x=>x.color===color)?.image_url} colorClick={click}/>
   <aside><span className="kd-reno-eyebrow">KD STUDIO / EVERYDAY COLLECTION</span><h2>{saved.name}</h2><p className="kd-demo-price">1.290.000 ₫</p><p>Clean lines. Considered details. Click an image to explore the texture, or switch colors to see another view.</p><hr/><label>COLOR — {color||'Cover'}</label><div className="kd-demo-swatches">{['Onyx','Oat'].map((c,i)=><button type="button" aria-label={c} aria-pressed={color===c} key={c} onClick={()=>{setColor(c);setClick(n=>n+1)}}><i style={{background:i?'#ddd4bd':'#272a28'}}/>{c}</button>)}</div><label>GALLERY LAYOUT</label><select aria-label="Gallery layout" value={layout} onChange={e=>setLayout(e.target.value)}><option value="left">Thumbnails on the left</option><option value="bottom">Thumbnails below</option></select><p className="kd-demo-note">Try arrows, thumbnails, swipe, zoom and full-screen viewing. Layout controls here are for this demo only.</p><button className="kd-demo-cta" type="button" onClick={()=>setTab('admin')}>OPEN PHOTO WORKSPACE ↗</button><small>Demo only. No checkout or database writes.</small></aside>
  </div>:<section className="kd-demo-editor"><p className="kd-demo-note">Use the real product editor below. Save previews photo changes for this session only. Refresh resets the demo. Brand creation and description persistence are not simulated.</p><ProductEditor resolvePhotoUrl={url=>url} key={version} product={saved} brands={[{id:1,name:'KD STUDIO'}]} collections={[]} busy={false} report={setMessage} api={demoApi} perform={async action=>{try{await action();setMessage('Demo saved for this session. Your selected cover is now shown on Storefront.');return true;}catch(e){setMessage(e.message);return false;}}} onCancel={()=>setTab('store')}/></section>}
  <footer className="kd-demo-footer">KD DESGIN · GALLERY EXPLORATION <span>Cover → Color → Detail</span></footer>
 </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('check'))import('./demo/galleryChecks.js').then(m=>m.runGalleryChecks());
