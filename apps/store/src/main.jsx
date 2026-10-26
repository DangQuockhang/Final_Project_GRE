import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Link,NavLink,Navigate,Route,Routes,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,Check,Wallet,ChevronRight,CircleUserRound,Heart,Instagram,Menu,Minus,Plus,Search,ShieldCheck,ShoppingBag,SlidersHorizontal,Sparkles,Trash2,Truck,X} from 'lucide-react';
import {apiBase,demoProducts,demoBrands,money} from '@kd/catalog';
import './style.css';
import './styles/sprint2.css';
import OrderProductThumb from './components/cart/OrderProductThumb.jsx';
import OrderCard from './components/orders/OrderCard.jsx';
import AddressLocator from './components/checkout/AddressLocator.jsx';
import {resolveCartProduct,effectivePrice,displayVariantColor,cartDisplayTotal} from './utils/cartDisplay.js';
import Eyebrow from './components/common/Eyebrow.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import BrandsPage from './pages/BrandsPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import './styles/shop-phase2.css';
import './styles/admin-phase2.css';
import './styles/product-images.css';
import './styles/admin-delete.css';
import './styles/readability-motion.css';
import './styles/editorial-home.css';
import './styles/retail-merge.css';
import './styles/retail-shoe-fallback.css';
import './styles/admin-workspace.css';
import './styles/checkout-cart.css';
import './styles/order-management.css';
import './styles/product-gallery-v2.css';
import './styles/brand-refresh.css';
import './styles/collections.css';
import './styles/white-background.css';
import './styles/home-products.css';
import AdminPage from './pages/admin/AdminPage.jsx';

const API=import.meta.env.VITE_API_URL||apiBase;
const request=async(path,{method='GET',body,token}={})=>{
 const multipart=typeof FormData!=='undefined'&&body instanceof FormData;
 const res=await fetch(`${API}${path}`,{method,headers:{...(body&&!multipart?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:multipart?body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);return data;
};
const authContext=createContext(null),cartContext=createContext(null),catalogContext=createContext(null);
const useAuth=()=>useContext(authContext),useCart=()=>useContext(cartContext),useCatalog=()=>useContext(catalogContext);

function Providers({children}){
 const [session,setSession]=useState(()=>{try{return JSON.parse(localStorage.getItem('kd_session')||'null')}catch{return null}});
 const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('kd_cart')||'[]')}catch{return []}});
 const [collections,setCollections]=useState([]);
 const [products,setProducts]=useState(demoProducts),[brands,setBrands]=useState(demoBrands),[online,setOnline]=useState(false),[loading,setLoading]=useState(true);
 const refresh=async()=>{try{const [p,b,c]=await Promise.all([request('/products'),request('/brands'),request('/collections')]);setProducts(p);setBrands(b);setCollections(c);setOnline(true);}catch{setProducts(demoProducts);setBrands(demoBrands);setCollections([]);setOnline(false);}finally{setLoading(false)}};
 useEffect(()=>{refresh();},[]);
 useEffect(()=>{localStorage.setItem('kd_cart',JSON.stringify(cart))},[cart]);
 useEffect(()=>{if(session)localStorage.setItem('kd_session',JSON.stringify(session));else localStorage.removeItem('kd_session')},[session]);
 const auth={session,login:setSession,logout:()=>setSession(null),token:session?.token,user:session?.user};
 const add=(product,variant,qty=1)=>{const key=String(variant.id);setCart(old=>{const i=old.findIndex(x=>x.key===key);if(i===-1)return [...old,{key,product,variant,quantity:qty}];return old.map((x,j)=>j===i?{...x,quantity:Math.min(20,x.quantity+qty)}:x)});};
 const update=(key,qty)=>setCart(old=>qty<=0?old.filter(x=>x.key!==key):old.map(x=>x.key===key?{...x,quantity:Math.max(1,Math.min(20,qty))}:x));
 const cartValue={cart,add,update,clear:()=>setCart([]),count:cart.reduce((s,x)=>s+x.quantity,0),total:cartDisplayTotal(cart,products)};
 return <authContext.Provider value={auth}><catalogContext.Provider value={{products,brands,collections,online,loading,refresh}}><cartContext.Provider value={cartValue}>{children}</cartContext.Provider></catalogContext.Provider></authContext.Provider>
}
function Header(){const {count}=useCart(),{user}=useAuth(),{brands,collections}=useCatalog();return <Navbar count={count} user={user} brands={brands} collections={collections}/> }
function Layout({children}){const {online,loading}=useCatalog();return <><Header/>{!loading&&!online&&<div className="demo-banner">API unavailable — product previews may be outdated. Ordering requires a connection to our server.</div>}<main>{children}</main><Footer/></>}
function Home(){const {products,brands}=useCatalog();return <Layout><HomePage products={products} brands={brands}/></Layout>}
function Shop(){const {products,brands,collections}=useCatalog();return <Layout><ShopPage products={products} brands={brands} collections={collections}/></Layout>}
function Brands(){const {brands,products}=useCatalog();return <Layout><BrandsPage brands={brands} products={products}/></Layout>}
function Product(){const {products,online,loading}=useCatalog(),{add}=useCart();return <Layout><ProductDetailPage products={products} online={online} loading={loading} addToCart={add}/></Layout>}
function Cart(){
 const {cart,update,total}=useCart(),{products}=useCatalog();
 const navigate=useNavigate();
 const rows=cart.map(entry=>({...entry,displayProduct:resolveCartProduct(entry,products)}));
 return <Layout>
  <section className="page-intro kd-bag-intro">
   <h1>Shopping <em>bag.</em></h1>
   <p>Review the pieces you love before checkout.</p>
  </section>
  <section className="cart-wrap kd-cart-page">
   {!rows.length?<div className="empty">
    Your bag is currently empty.
    <Link className="button button-dark" to="/shop">EXPLORE ALL PRODUCTS <ArrowRight size={18}/></Link>
   </div>:<>
    <div className="cart-list kd-cart-list">
     {rows.map(entry=>{
      const product=entry.displayProduct,color=displayVariantColor(entry,product);
      const unit=effectivePrice(product),discount=product?.sale_price!=null&&unit<Number(product.price);
      return <article key={entry.key} className="cart-item kd-cart-item">
       <Link to={'/product/'+product.slug} className="kd-cart-photo-link" aria-label={'View '+product.name}>
        <OrderProductThumb product={product}/>
       </Link>
       <div className="cart-info kd-cart-info">
        <small>{product.brand_name}</small>
        <Link to={'/product/'+product.slug} className="kd-cart-product-name">{product.name}</Link>
        <div className="kd-cart-variant"><span>Size: {entry.variant.size}</span>{color&&<span>Color: {color}</span>}</div>
        <div className="kd-cart-line-price">{discount&&<del>{money(product.price)}</del>}<strong>{money(unit)}</strong></div>
        <div className="cart-quantity">
         <button type="button" aria-label={'Decrease '+product.name+' quantity'} onClick={()=>update(entry.key,entry.quantity-1)}><Minus size={16}/></button>
         <span aria-label="Quantity">{entry.quantity}</span>
         <button type="button" aria-label={'Increase '+product.name+' quantity'} onClick={()=>update(entry.key,entry.quantity+1)}><Plus size={16}/></button>
         <button type="button" className="remove" onClick={()=>update(entry.key,0)} aria-label={'Remove '+product.name}><Trash2 size={19}/></button>
        </div>
       </div>
       <strong className="kd-cart-line-total">{money(unit*entry.quantity)}</strong>
      </article>;
     })}
     <Link to="/shop" className="kd-cart-continue"><ArrowRight size={17}/> Continue shopping</Link>
    </div>
    <aside className="order-summary kd-cart-summary">
     <h3>YOUR ORDER</h3>
     <div><span>Items ({cart.reduce((n,x)=>n+x.quantity,0)})</span><b>{money(total)}</b></div>
     <div><span>Shipping</span><span>Not included in demo</span></div>
     <div className="summary-total"><span>ESTIMATED TOTAL</span><b>{money(total)}</b></div>
     <button className="button button-dark full-width" onClick={()=>navigate('/checkout')}>CONTINUE TO CHECKOUT <ArrowRight size={18}/></button>
     <p>Prices and inventory are checked again by the server when you place the order.</p>
    </aside>
   </>}
  </section>
 </Layout>;
}
function Login(){const {login}=useAuth();const nav=useNavigate();const [register,setRegister]=useState(false),[form,setForm]=useState({name:'',email:'',password:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false);async function submit(e){e.preventDefault();setBusy(true);setError('');try{const r=await request(register?'/auth/register':'/auth/login',{method:'POST',body:form});login(r);nav(r.user.role==='admin'?'/admin':'/account')}catch(e){setError(e.message)}finally{setBusy(false)}}return <Layout><section className="login-layout"><div className="login-art"><Eyebrow>WELCOME TO KD DESGIN</Eyebrow><h2>Wear it.<br/><em>Own it.</em></h2><span>YOUR STYLE IS YOUR SIGNATURE.</span></div><form className="auth-form" onSubmit={submit}><Eyebrow>YOUR ACCOUNT</Eyebrow><h1>{register?'Create account.':'Welcome back.'}</h1><p>{register?'Join the KD community.':'Sign in to manage your account and orders.'}</p>{register&&<label>FULL NAME<input required minLength={2} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}<label>EMAIL<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>PASSWORD<input type="password" required minLength={register?8:1} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>{error&&<div className="message-error">{error}</div>}<button disabled={busy} className="button button-dark full-width">{busy?'PLEASE WAIT...':register?'CREATE ACCOUNT':'SIGN IN'} <ArrowRight size={18}/></button><button type="button" className="text-button" onClick={()=>{setRegister(!register);setError('')}}>{register?'Already have an account? Sign in':'New here? Create an account'}</button></form></section></Layout>}
function RequireAuth({children,admin=false}){const {user}=useAuth();if(!user)return <Navigate to="/login" replace/>;if(admin&&user.role!=='admin')return <Navigate to="/account" replace/>;return children}
function Account(){
 const {user,token,logout}=useAuth();
 const [orders,setOrders]=useState([]),[payments,setPayments]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let live=true;
  Promise.all([request('/orders/mine',{token}),request('/payment-methods')]).then(([records,config])=>{
   if(live){setOrders(records);setPayments(config);}
  }).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});
  return ()=>{live=false};
 },[token]);
 return <Layout>
  <section className="page-intro kd-account-intro"><h1>My <em>account.</em></h1>
   <p>{user.name} · {user.email}</p><button className="text-button" type="button" onClick={logout}>Sign out →</button>
  </section>
  <section className="section account-orders kd-account-orders">
   <div className="kd-order-history-heading"><div><h2>My orders</h2><p>Review your purchases, payment and delivery progress.</p></div>
    <Link to="/shop">Continue shopping <ArrowRight size={17}/></Link></div>
   {error&&<p className="message-error" role="alert">{error}</p>}
   {loading?<p>Loading orders…</p>:!orders.length?<div className="kd-account-empty">No orders yet. <Link to="/shop">Explore products</Link></div>:<div className="kd-order-list">
    {orders.map(order=><OrderCard key={order.id} order={order} paymentConfig={payments}/>)}
   </div>}
   {user.role==='admin'&&<Link className="button button-dark kd-account-admin" to="/admin">ADMIN DASHBOARD <ArrowRight size={18}/></Link>}
  </section>
 </Layout>;
}
function Checkout(){
 const {user,token}=useAuth(),{cart,total,clear}=useCart(),{products}=useCatalog();
 const navigate=useNavigate();
 const [form,setForm]=useState({recipient:user.name||'',phone:'',address:''});
 const [paymentMethod,setPaymentMethod]=useState('COD');
 const [paymentConfig,setPaymentConfig]=useState(null);
 useEffect(()=>{let live=true;request('/payment-methods').then(config=>{if(live)setPaymentConfig(config)}).catch(()=>{});
  return ()=>{live=false};},[]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const rows=cart.map(entry=>({...entry,displayProduct:resolveCartProduct(entry,products)}));
 async function submit(e){
  e.preventDefault();
  if(!cart.length)return;
  setBusy(true);setError('');
  try{
   const order=await request('/orders',{method:'POST',token,body:{
    ...form,payment_method:paymentMethod,items:cart.map(entry=>({variant_id:Number(entry.variant.id),quantity:entry.quantity}))
   }});
   clear();navigate('/order-success',{state:{order,paymentConfig}});
  }catch(e){setError(e.message)}finally{setBusy(false);}
 }
 return <Layout>
  <section className="kd-checkout-intro">
   <nav className="kd-checkout-crumbs" aria-label="Checkout steps">
    <Link to="/cart">Shopping bag</Link><ChevronRight size={17}/><span aria-current="step">Checkout</span>
   </nav>
   <div className="kd-checkout-intro-row">
    <div><h1>Check<em>out.</em></h1>
     <p>Confirm your products, delivery address and payment method.</p>
    </div>
    <div className="kd-checkout-secure"><ShieldCheck size={22}/><span>REVIEW BEFORE YOU PLACE YOUR ORDER</span></div>
   </div>
  </section>
  {!rows.length?<section className="kd-checkout-empty">
   <ShoppingBag size={38}/>
   <h2>Your shopping bag is empty.</h2>
   <p>Add a piece to your bag before checking out.</p>
   <Link className="button button-dark" to="/shop">EXPLORE PRODUCTS <ArrowRight size={18}/></Link>
  </section>:
  <div className="checkout-wrap kd-checkout-page">
   <form onSubmit={submit} className="checkout-form kd-checkout-form">
    <div className="kd-checkout-form-heading"><Truck size={24}/><div><h2>Delivery information</h2><p>Provide a complete delivery address and confirm it before ordering.</p></div></div>
    <label htmlFor="kd-recipient">RECIPIENT NAME
     <input id="kd-recipient" required autoComplete="name" value={form.recipient}
      onChange={e=>setForm({...form,recipient:e.target.value})} placeholder="Your full name"/>
    </label>
    <label htmlFor="kd-phone">PHONE NUMBER
     <input id="kd-phone" type="tel" inputMode="tel" required minLength={9}
      autoComplete="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
      placeholder="Contact number"/>
    </label>
    <label htmlFor="kd-address">DELIVERY ADDRESS
     <textarea id="kd-address" required minLength={10} rows={4} maxLength={750}
      autoComplete="street-address" value={form.address}
      onChange={e=>setForm({...form,address:e.target.value})}
      placeholder="House number, street, ward, district, province or city"/>
    </label>
    <AddressLocator onSuggest={address=>setForm(previous=>({...previous,address}))}/>
    <fieldset className="kd-payment-choices">
     <legend>PAYMENT METHOD</legend>
     <label className={'kd-payment-choice'+(paymentMethod==='COD'?' is-active':'')}>
      <input type="radio" name="kd-payment" value="COD" checked={paymentMethod==='COD'} onChange={()=>setPaymentMethod('COD')}/>
      <Truck size={21}/><span><strong>Cash on Delivery (COD)</strong><small>Pay when your order is delivered</small></span>
     </label>
     <label className={'kd-payment-choice'+(paymentMethod==='BANK_TRANSFER'?' is-active':'')}>
      <input type="radio" name="kd-payment" value="BANK_TRANSFER" checked={paymentMethod==='BANK_TRANSFER'}
       disabled={!paymentConfig?.bank_transfer?.enabled} onChange={()=>setPaymentMethod('BANK_TRANSFER')}/>
      <Wallet size={21}/><span><strong>Bank transfer</strong>
       <small>{paymentConfig?.bank_transfer?.enabled?'Transfer after placing the order · verification required':'Unavailable until the store configures bank details'}</small></span>
     </label>
     {paymentMethod==='BANK_TRANSFER'&&paymentConfig?.bank_transfer?.enabled&&
      <p className="kd-payment-help">Bank: {paymentConfig.bank_transfer.bank} · Beneficiary: {paymentConfig.bank_transfer.name}. Your unique order reference and account details will appear after checkout. No automatic payment collection occurs.</p>}
    </fieldset>
    {error&&<div className="message-error" role="alert">{error}</div>}
    <button type="submit" className="button button-dark full-width kd-checkout-place-order" disabled={busy}>
     {busy?'PROCESSING…':'PLACE ORDER'} <ArrowRight size={19}/>
    </button>
    <p className="kd-checkout-demo-note">This checkout is under development. Use test information until your store is ready for real customer orders.</p>
   </form>
   <aside className="order-summary kd-checkout-summary" aria-label="Order review">
    <div className="kd-checkout-summary-heading"><div><span>YOUR SELECTION</span><h2>Order review</h2></div><Link to="/cart">Edit bag <ArrowRight size={16}/></Link></div>
    <div className="kd-checkout-items">
     {rows.map(entry=>{
      const product=entry.displayProduct,color=displayVariantColor(entry,product);
      const unit=effectivePrice(product),discount=product?.sale_price!=null&&unit<Number(product.price);
      return <article className="kd-checkout-line" key={entry.key}>
       <Link to={'/product/'+product.slug} className="kd-checkout-photo-link" aria-label={'View '+product.name}>
        <OrderProductThumb product={product}/>
       </Link>
       <div className="kd-checkout-line-details">
        <small>{product.brand_name}</small>
        <Link to={'/product/'+product.slug}>{product.name}</Link>
        <div className="kd-checkout-variant">Size: {entry.variant.size}{color?' · '+color:''} <span>× {entry.quantity}</span></div>
        {discount&&<del>{money(product.price)}</del>}
        <strong>{money(unit*entry.quantity)}</strong>
       </div>
      </article>;
     })}
    </div>
    <div className="kd-checkout-totals">
     <div><span>Subtotal ({cart.reduce((n,x)=>n+x.quantity,0)} items)</span><b>{money(total)}</b></div>
     <div><span>Shipping</span><span>Not included in demo</span></div>
     <div className="kd-checkout-total"><span>ESTIMATED TOTAL</span><strong>{money(total)}</strong></div>
    </div>
    <p className="kd-checkout-summary-note"><ShieldCheck size={17}/> Server verifies prices and stock when your order is placed. Shipping is excluded from this demonstration.</p>
   </aside>
  </div>}
 </Layout>;
}
function OrderSuccess(){
 const {state}=useLocation(),order=state?.order,config=state?.paymentConfig;
 return <Layout><div className="success-screen kd-order-success">
  <Check size={36}/><h1>Order received.</h1>
  {order?<><p>Reference: <strong>{order.order_code}</strong></p>
   {order.payment_method==='BANK_TRANSFER'&&config?.bank_transfer?.enabled?
    <div className="kd-bank-instructions">
     <strong>Transfer the order amount to:</strong>
     <span>{config.bank_transfer.bank} · {config.bank_transfer.name}</span>
     <span>Account: {config.bank_transfer.account}</span>
     <span>Amount: {money(order.total)}</span>
     <span>Reference: {order.order_code}</span>
     <small>Your payment is awaiting manual confirmation. Do not assume the order is paid.</small>
    </div>:
    <p>Cash on delivery selected. Your order is awaiting confirmation.</p>}
  </>:<p>Your order details are available in My Account.</p>}
  <Link className="button button-dark" to="/account">VIEW MY ORDERS <ArrowRight size={18}/></Link>
 </div></Layout>;
}
function Admin(){const {token,user}=useAuth(),{refresh}=useCatalog();return <Layout><AdminPage user={user} token={token} request={request} refreshCatalog={refresh}/></Layout>}
function App(){return <Providers><BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/brands" element={<Brands/>}/><Route path="/product/:slug" element={<Product/>}/><Route path="/cart" element={<Cart/>}/><Route path="/login" element={<Login/>}/><Route path="/account" element={<RequireAuth><Account/></RequireAuth>}/><Route path="/checkout" element={<RequireAuth><Checkout/></RequireAuth>}/><Route path="/order-success" element={<RequireAuth><OrderSuccess/></RequireAuth>}/><Route path="/admin" element={<RequireAuth admin><Admin/></RequireAuth>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></BrowserRouter></Providers>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
