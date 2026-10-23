import React,{useEffect,useState} from 'react';
import {Package,Tags,ClipboardList,ChartNoAxesColumn,RefreshCw} from 'lucide-react';
import {money} from '@kd/catalog';
import Eyebrow from '../../components/common/Eyebrow.jsx';
import {adminMetrics} from '../../utils/adminValidation.js';
import BrandsPanel from './BrandsPanel.jsx';
import ProductsPanel from './ProductsPanel.jsx';
import CollectionsPanel from './CollectionsPanel.jsx';
import OrdersPanel from './OrdersPanel.jsx';

const TABS=[['overview','Overview',ChartNoAxesColumn],['products','Products / Inventory',Package],['collections','Collections',Tags],['brands','Brands',Tags],['orders','Orders',ClipboardList]];
export default function AdminPage({user,token,request,refreshCatalog}){
  const [tab,setTab]=useState('overview');
  const [products,setProducts]=useState([]),[brands,setBrands]=useState([]),[orders,setOrders]=useState([]);
  const [collections,setCollections]=useState([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const api=(path,options={})=>request(path,{...options,token});
  async function reload(){
    const [p,b,o,c]=await Promise.all([
      api('/admin/products'),api('/brands'),api('/admin/orders'),api('/admin/collections')
    ]);
    setProducts(p);setBrands(b);setOrders(o);setCollections(c);
    await refreshCatalog();
  }
  useEffect(()=>{
    let live=true;
    Promise.all([
      request('/admin/products',{token}),
      request('/brands',{token}),
      request('/admin/orders',{token}),
      request('/admin/collections',{token})
     ]).then(([p,b,o,c])=>{
      if(live){setProducts(p);setBrands(b);setOrders(o);setCollections(c);}
    }).catch(e=>{if(live)setError(e.message||'Unable to load admin data.');})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false};
  },[token,request]);
  function report(message){setError(message);setNotice('');}
  async function perform(operation,successMessage='Saved successfully.'){
    if(busy)return false;
    setBusy(true);setError('');setNotice('');
    try{
      await operation();
      await reload();
      setNotice(successMessage);
      return true;
    }catch(e){setError(e.message||'Something went wrong.');return false;}
    finally{setBusy(false);}
  }
  const stats=adminMetrics(products,orders);
  const common={api,perform,busy,report};
  return <div className="admin-shell kd-admin-shell">
    <div className="admin-top">
      <div><Eyebrow>KD DESIGN / ADMIN ONLY</Eyebrow><h1>Command <em>center.</em></h1><p>Signed in as {user?.email||'Administrator'} · Management workspace</p></div>
      <span className="admin-chip">STORE OPERATIONS</span>
    </div>
    <div className="kd-admin-stat-grid" aria-label="Admin metrics">
      <div><span>ACTIVE PRODUCTS</span><strong>{stats.active}</strong><small>Current admin catalog (up to 200)</small></div>
      <div><span>LOW STOCK VARIANTS</span><strong>{stats.lowStock}</strong><small>Between 1 and 3 units</small></div>
      <div><span>PENDING ORDERS</span><strong>{stats.pending}</strong><small>Orders awaiting confirmation</small></div>
      <div><span>DELIVERED ORDER VALUE</span><strong className="kd-admin-money">{money(stats.deliveredValue)}</strong><small>Not verified collected revenue</small></div>
    </div>
    <nav className="admin-tabs kd-admin-tabs" aria-label="Admin sections">
      {TABS.map(([key,label,Icon])=><button key={key} type="button" className={tab===key?'active':''} aria-current={tab===key?'page':undefined} onClick={()=>{setTab(key);setError('');setNotice('');}}>
        <Icon size={15}/>{label}
      </button>)}
    </nav>
    <div aria-live="polite">
      {error&&<div className="message-error kd-admin-alert" role="alert">{error}</div>}
      {notice&&<div className="message-success kd-admin-alert">{notice}</div>}
    </div>
    {loading?<div className="kd-admin-placeholder" role="status">Loading dashboard data…</div>:
      <div className="kd-admin-content">
        {tab==='overview'&&<section className="kd-admin-overview">
          <div><h2>Operational overview</h2><p>Manage brands, SKU-level inventory and customer orders in one workspace.</p></div>
          <div className="kd-admin-quick">
            <button type="button" onClick={()=>setTab('products')}><Package size={19}/> Manage products</button>
            <button type="button" onClick={()=>setTab('brands')}><Tags size={19}/> Manage brands</button>
            <button type="button" onClick={()=>setTab('orders')}><ClipboardList size={19}/> Process orders</button>
            <button type="button" disabled={busy} onClick={()=>perform(async()=>{},'Dashboard refreshed.')}><RefreshCw size={19}/> Refresh data</button>
          </div>
          <p className="kd-admin-hint">Categories are Accessories, Bags, Clothing and Shoes. Use Product Type to classify subcategories such as Jacket, T-Shirt or Slides.</p>
        </section>}
        {tab==='collections'&&<CollectionsPanel {...common} collections={collections}/>}
        {tab==='brands'&&<BrandsPanel {...common} brands={brands} products={products}/>}
        {tab==='products'&&<ProductsPanel {...common} products={products} brands={brands} collections={collections}/>}
        {tab==='orders'&&<OrdersPanel {...common} orders={orders}/>}
      </div>}
  </div>;
}
