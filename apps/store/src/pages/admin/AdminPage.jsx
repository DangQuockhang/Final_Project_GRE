import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Package,Tags,ClipboardList,LayoutDashboard,RefreshCw,ArrowUpRight,LogOut,Layers} from 'lucide-react';
import BrandsPanel from './BrandsPanel.jsx';
import ProductsPanel from './ProductsPanel.jsx';
import CollectionsPanel from './CollectionsPanel.jsx';
import OrdersPanel from './OrdersPanel.jsx';
import DashboardOverview from './DashboardOverview.jsx';
import '../../styles/admin-dashboard.css';
const TABS=[['overview','Overview',LayoutDashboard],['orders','Orders',ClipboardList],['products','Products & stock',Package],['collections','Collections',Layers],['brands','Brands',Tags]];
const mergeRows=(rows,extra)=>[...new Map([...rows,...extra].map(row=>[String(row.id),row])).values()];
export default function AdminPage({user,token,request,refreshCatalog,onLogout}){
 const [tab,setTab]=useState('overview'),[focus,setFocus]=useState({});
 const [products,setProducts]=useState([]),[brands,setBrands]=useState([]),[orders,setOrders]=useState([]),[collections,setCollections]=useState([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [days,setDays]=useState(30),[dashboard,setDashboard]=useState(null),[dashLoading,setDashLoading]=useState(true),[dashError,setDashError]=useState(''),[revision,setRevision]=useState(0);
 const lock=useRef(false);
 const api=(path,options={})=>request(path,{...options,token});
 async function reload(){
  const [p,b,o,c]=await Promise.all([api('/admin/products'),api('/brands'),api('/admin/orders'),api('/admin/collections')]);
  setProducts(p);setBrands(b);setOrders(o);setCollections(c);
  setRevision(n=>n+1);
  await refreshCatalog();
 }
 useEffect(()=>{
  let live=true;setLoading(true);
  Promise.all([request('/admin/products',{token}),request('/brands',{token}),request('/admin/orders',{token}),request('/admin/collections',{token})])
   .then(([p,b,o,c])=>{if(live){setProducts(p);setBrands(b);setOrders(o);setCollections(c);}})
   .catch(e=>{if(live)setError(e.message||'Unable to load admin data.');})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[token,request]);
 useEffect(()=>{
  let live=true;setDashLoading(true);setDashError('');
  request('/admin/dashboard?days='+days,{token})
   .then(data=>{if(live)setDashboard(data);})
   .catch(e=>{if(live)setDashError(e.message||'Unable to load analytics.');})
   .finally(()=>{if(live)setDashLoading(false);});
  return()=>{live=false;};
 },[days,revision,token,request]);
 function report(message){setError(message);setNotice('');}
 async function perform(operation,successMessage='Saved successfully.'){
  if(lock.current)return false;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await operation();await reload();setNotice(successMessage);return true;}
  catch(e){setError(e.message||'Something went wrong.');return false;}
  finally{lock.current=false;setBusy(false);}
 }
 async function navigate(next,options={}){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   if(next==='orders'&&Object.keys(options).length){
    const query=new URLSearchParams(options);
    const rows=await api('/admin/orders?'+query);
    setOrders(old=>mergeRows(old,rows));
   }
   if(next==='products'&&options.id){
    const rows=await api('/admin/products?id='+encodeURIComponent(options.id));
    if(!rows.length)throw Error('Product no longer exists. Refresh the dashboard.');
    setProducts(old=>mergeRows(old,rows));
   }
   setFocus(options);setTab(next);
  }catch(e){report(e.message);}
  finally{lock.current=false;setBusy(false);}
 }
 const common={api,perform,busy,report};
 return <div className="kd-ops">
  <aside className="kd-ops-sidebar">
   <Link to="/" className="kd-ops-logo">KD<span>COMMERCE ADMIN</span></Link>
   <span className="kd-ops-nav-label">WORKSPACE</span>
   <nav aria-label="Admin sections">{TABS.map(([key,label,Icon])=><button type="button" disabled={busy} key={key} aria-current={tab===key?'page':undefined} onClick={()=>navigate(key)}><Icon size={19}/>{label}{key==='orders'&&dashboard?.operations.pending>0&&<b>{dashboard.operations.pending}</b>}</button>)}</nav>
   <div className="kd-ops-sidebar-bottom"><Link to="/shop"><ArrowUpRight size={17}/> View storefront</Link><div><i>{(user?.name||user?.email||'A').slice(0,1).toUpperCase()}</i><span><strong>{user?.name||'Administrator'}</strong><small>{user?.email}</small></span></div>{onLogout&&<button type="button" onClick={onLogout}><LogOut size={16}/> Sign out</button>}</div>
  </aside>
  <main className="kd-ops-main">
   <header className="kd-ops-topbar"><span>Workspace <span>/</span> <strong>{TABS.find(t=>t[0]===tab)?.[1]}</strong></span><div><i/> Administrator access <Link to="/shop" className="kd-ops-mobile-link">Store</Link>{onLogout&&<button type="button" className="kd-ops-mobile-link" disabled={busy} onClick={onLogout}>Sign out</button>}</div></header>
   <div className="kd-ops-body">
    <div className="kd-ops-heading"><div><span className="kd-ops-eyebrow">YOUR STORE, AT A GLANCE</span><h1>{tab==='overview'?'Store overview':TABS.find(t=>t[0]===tab)?.[1]}</h1><p>{tab==='overview'?'A clear view of performance. A focused list of what needs you.':'Manage your catalog and orders in one workspace.'}</p></div>
     <button className="kd-ops-button" type="button" disabled={busy||loading||dashLoading} onClick={()=>perform(async()=>{},'Store data refreshed.')}><RefreshCw size={16} className={busy?'kd-ops-spin':''}/> Refresh data</button>
    </div>
    <div aria-live="polite">{error&&<div className="kd-ops-alert" role="alert">{error}</div>}{notice&&<div className="kd-ops-notice">{notice}</div>}</div>
    {tab==='overview'?<DashboardOverview data={dashboard} loading={dashLoading} error={dashError} days={days} onDays={setDays} onRetry={()=>setRevision(n=>n+1)} onNavigate={navigate} busy={busy}/>:
     loading?<div className="kd-ops-loading" role="status">Loading your workspace…</div>:<div className="kd-ops-panel-content">
      {tab==='collections'&&<CollectionsPanel {...common} collections={collections}/>}
      {tab==='brands'&&<BrandsPanel {...common} brands={brands} products={products}/>}
      {tab==='products'&&<ProductsPanel {...common} key={'products-'+JSON.stringify(focus)} initialEditingId={focus.id} initialCreate={focus.create} products={products} brands={brands} collections={collections}/>}
      {tab==='orders'&&<OrdersPanel {...common} key={'orders-'+JSON.stringify(focus)} initialStatus={focus.status} initialPaymentStatus={focus.payment_status} initialOrderId={focus.id} orders={orders}/>}
     </div>}
   </div>
  </main>
 </div>;
}
