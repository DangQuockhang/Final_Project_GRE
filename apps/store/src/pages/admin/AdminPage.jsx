import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Link,Navigate,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {Package,Tags,ClipboardList,LayoutDashboard,RefreshCw,ArrowUpRight,LogOut,Layers,ChevronRight,ArrowLeft,Boxes,TrendingUp,ClipboardCheck} from 'lucide-react';
import BrandsPanel from './BrandsPanel.jsx';
import ProductsPanel from './ProductsPanel.jsx';
import CollectionsPanel from './CollectionsPanel.jsx';
import OrdersPanel from './OrdersPanel.jsx';
import DashboardOverview from './DashboardOverview.jsx';
import AdminReportPage from './AdminReportPage.jsx';
import {adminPath,adminSection,adminReturnPath} from '../../utils/adminNavigation.js';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-reports.css';
const TABS=[['overview','Overview',LayoutDashboard],['orders','Orders',ClipboardList],['inventory','Stock watchlist',Boxes],['best-sellers','Best-selling products',TrendingUp],['catalog-health','Catalog health',ClipboardCheck],['products','Products',Package],['collections','Collections',Layers],['brands','Brands',Tags]];
const descriptions={
 overview:'A focused overview. Open a workspace below for the complete records.',
 orders:'Search every order, review delivery details and manage payment or fulfilment.',
 inventory:'Inspect active SKUs, find shortages and open the exact product to update stock.',
 'best-sellers':'Compare products by units ordered and order value in your selected period.',
 'catalog-health':'Find draft products, missing cover photos and missing inventory variants.',
 products:'Manage product content, photos, variants and availability.',
 collections:'Organize the collections shoppers can browse.',
 brands:'Manage brands and their size guides.'
};
const mergeRows=(rows,extra)=>[...new Map([...rows,...extra].map(row=>[String(row.id),row])).values()];
export default function AdminPage({user,token,request,refreshCatalog,onLogout}){
 const location=useLocation(),routerNavigate=useNavigate(),[params]=useSearchParams();
 const tab=adminSection(location.pathname),recordId=params.get('id'),creating=params.get('create')==='1';
 const days=[7,30,90].includes(Number(params.get('days')))?Number(params.get('days')):30;
 const isReport=['inventory','best-sellers','catalog-health'].includes(tab)||(tab==='orders'&&!recordId);
 const needsPanel=!!tab&&tab!=='overview'&&!isReport;
 const [products,setProducts]=useState([]),[brands,setBrands]=useState([]),[orders,setOrders]=useState([]),[collections,setCollections]=useState([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [dashboard,setDashboard]=useState(null),[dashLoading,setDashLoading]=useState(true),[dashError,setDashError]=useState(''),[revision,setRevision]=useState(0);
 const lock=useRef(false),loadedPanel=useRef('');
 const panelKey=tab+'-'+(recordId||'');
 const [panelError,setPanelError]=useState('');
 const api=useCallback((path,options={})=>request(path,{...options,token}),[request,token]);
 useEffect(()=>{
  let live=true;setPanelError('');
  if(!needsPanel){loadedPanel.current='';setLoading(false);return;}
  setLoading(loadedPanel.current!==panelKey);
  (async()=>{
   if(tab==='orders'){
    const rows=await api('/admin/orders?id='+encodeURIComponent(recordId));
    if(!rows.length)throw Error('Không tìm thấy đơn hàng này.');
    if(live)setOrders(rows);
   }else{
    const [p,b,c,selected]=await Promise.all([api('/admin/products'),api('/brands'),api('/admin/collections'),
     tab==='products'&&recordId?api('/admin/products?id='+encodeURIComponent(recordId)):Promise.resolve([])]);
    if(tab==='products'&&recordId&&!selected.length)throw Error('Không tìm thấy sản phẩm này.');
    if(live){setProducts(mergeRows(p,selected));setBrands(b);setCollections(c);}
   }
  })().then(()=>{if(live)loadedPanel.current=panelKey;}).catch(e=>{if(live)setPanelError(e.message||'Không thể tải dữ liệu.');}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[tab,recordId,needsPanel,panelKey,revision,api]);
 useEffect(()=>{setError('');setNotice('');},[tab,recordId]);
 useEffect(()=>{
  if(tab!=='overview')return;
  let live=true;setDashLoading(true);setDashError('');
  api('/admin/dashboard?days='+days).then(data=>{if(live)setDashboard(data);})
   .catch(e=>{if(live)setDashError(e.message||'Không thể tải tổng quan.');})
   .finally(()=>{if(live)setDashLoading(false);});
  return()=>{live=false;};
 },[tab,days,revision,api]);
 function report(message){setError(message);setNotice('');}
 async function perform(operation,successMessage='Saved successfully.'){
  if(lock.current)return false;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await operation();await refreshCatalog();setRevision(n=>n+1);setNotice(successMessage);return true;}
  catch(e){setError(e.message||'Không thể lưu thay đổi.');return false;}
  finally{lock.current=false;setBusy(false);}
 }
 function navigate(next,options={}){
  if(lock.current)return;
  routerNavigate(adminPath(next,options),{state:{returnTo:location.pathname+location.search,returnState:location.state}});
 }
 const backTo=adminReturnPath(location.state?.returnTo,tab==='orders'&&recordId?'/admin/orders':'/admin');
 const closeEditor=()=>{if(recordId||creating)routerNavigate(adminReturnPath(location.state?.returnTo,'/admin/products'),{replace:true,state:location.state?.returnState});};
 const common={api,perform,busy,report};
 const label=TABS.find(item=>item[0]===tab)?.[1];
 if(!tab)return <Navigate to="/admin" replace/>;
 return <div className="kd-ops">
  <aside className="kd-ops-sidebar">
   <Link to="/" className="kd-ops-logo">KD<span>COMMERCE ADMIN</span></Link>
   <span className="kd-ops-nav-label">WORKSPACE</span>
   <nav aria-label="Admin sections">{TABS.map(([key,title,Icon])=><Link key={key} to={adminPath(key)} aria-current={tab===key?'page':undefined}><Icon size={19}/>{title}{key==='orders'&&dashboard?.operations.pending>0&&<b>{dashboard.operations.pending}</b>}</Link>)}</nav>
   <div className="kd-ops-sidebar-bottom"><Link to="/shop"><ArrowUpRight size={17}/> View storefront</Link><Link to="/account" className="kd-ops-account-link" aria-label="Mở tài khoản của tôi" title="Tài khoản của tôi"><i aria-hidden="true">{(user?.name||user?.email||'A').slice(0,1).toUpperCase()}</i><span><strong>{user?.name||'Administrator'}</strong><small>{user?.email}</small></span><ChevronRight size={16} className="kd-ops-account-arrow" aria-hidden="true"/></Link>{onLogout&&<button type="button" onClick={onLogout}><LogOut size={16}/> Sign out</button>}</div>
  </aside>
  <main className="kd-ops-main">
   <header className="kd-ops-topbar"><span>Workspace <span>/</span> <strong>{label}</strong></span><div><i/> Administrator access <Link to="/shop" className="kd-ops-mobile-link">Store</Link><Link to="/account" className="kd-ops-mobile-link" aria-label="Mở tài khoản của tôi">Account</Link>{onLogout&&<button type="button" className="kd-ops-mobile-link" disabled={busy} onClick={onLogout}>Sign out</button>}</div></header>
   <div className="kd-ops-body">
    {tab!=='overview'&&<Link className="kd-ops-back" to={backTo} state={location.state?.returnState}><ArrowLeft size={17}/>{recordId?'Back to list':'Back to overview'}</Link>}
    <div className="kd-ops-heading"><div><span className="kd-ops-eyebrow">{tab==='overview'?'YOUR STORE, AT A GLANCE':'STORE WORKSPACE'}</span><h1>{tab==='overview'?'Store overview':tab==='orders'&&recordId?'Order details':label}</h1><p>{descriptions[tab]}</p></div>
     <button className="kd-ops-button" type="button" disabled={busy||(needsPanel&&loading)||(tab==='overview'&&dashLoading)} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/> Refresh data</button>
    </div>
    <div aria-live="polite">{(error||panelError)&&<div className="kd-ops-alert" role="alert">{error||panelError}</div>}{notice&&<div className="kd-ops-notice">{notice}</div>}</div>
    {tab==='overview'?<DashboardOverview data={dashboard} loading={dashLoading} error={dashError} days={days} onDays={value=>routerNavigate(adminPath('overview',{days:value}),{replace:true})} onRetry={()=>setRevision(n=>n+1)} onNavigate={navigate} busy={busy}/>:
     isReport?<AdminReportPage key={tab} kind={tab} api={api} revision={revision} onNavigate={navigate}/>:
     (loading||(loadedPanel.current!==panelKey&&!panelError))?<div className="kd-ops-skeleton" role="status"><div/><div/><p>Loading your workspace…</p></div>:
     panelError&&loadedPanel.current!==panelKey?<button className="kd-ops-button" onClick={()=>setRevision(n=>n+1)}>Try again</button>:
     <div className="kd-ops-panel-content">
      {tab==='collections'&&<CollectionsPanel {...common} collections={collections}/>}
      {tab==='brands'&&<BrandsPanel {...common} brands={brands} products={products}/>}
      {tab==='products'&&<ProductsPanel {...common} key={'products-'+recordId+'-'+creating} initialEditingId={recordId} initialCreate={creating} onFocusClose={closeEditor} products={products} brands={brands} collections={collections}/>}
      {tab==='orders'&&<OrdersPanel {...common} key={'order-'+recordId} initialOrderId={recordId} orders={orders}/>}
     </div>}
   </div>
  </main>
 </div>;
}
