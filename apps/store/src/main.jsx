import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Link,NavLink,Navigate,Route,Routes,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,Check,ChevronRight,CircleUserRound,Heart,Instagram,Menu,Minus,Plus,Search,ShieldCheck,ShoppingBag,SlidersHorizontal,Sparkles,Trash2,Truck,X} from 'lucide-react';
import {TryOnStudio} from '@kd/virtual-fitting';
import {apiBase,demoProducts,demoBrands,money} from '@kd/catalog';
import './style.css';
import './styles/sprint2.css';
import OrderProductThumb from './components/cart/OrderProductThumb.jsx';
import {resolveCartProduct,effectivePrice,displayVariantColor,cartDisplayTotal} from './utils/cartDisplay.js';
import Eyebrow from './components/common/Eyebrow.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
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
import AdminPage from './pages/admin/AdminPage.jsx';

const API=import.meta.env.VITE_API_URL||apiBase;
const FITTING_URL=import.meta.env.VITE_STUDIO_URL||'http://localhost:5174';
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
 const [products,setProducts]=useState(demoProducts),[brands,setBrands]=useState(demoBrands),[online,setOnline]=useState(false),[loading,setLoading]=useState(true);
 const refresh=async()=>{try{const [p,b]=await Promise.all([request('/products'),request('/brands')]);setProducts(p);setBrands(b);setOnline(true);}catch{setProducts(demoProducts);setBrands(demoBrands);setOnline(false);}finally{setLoading(false)}};
 useEffect(()=>{refresh();},[]);
 useEffect(()=>{localStorage.setItem('kd_cart',JSON.stringify(cart))},[cart]);
 useEffect(()=>{if(session)localStorage.setItem('kd_session',JSON.stringify(session));else localStorage.removeItem('kd_session')},[session]);
 const auth={session,login:setSession,logout:()=>setSession(null),token:session?.token,user:session?.user};
 const add=(product,variant,qty=1)=>{const key=String(variant.id);setCart(old=>{const i=old.findIndex(x=>x.key===key);if(i===-1)return [...old,{key,product,variant,quantity:qty}];return old.map((x,j)=>j===i?{...x,quantity:Math.min(20,x.quantity+qty)}:x)});};
 const update=(key,qty)=>setCart(old=>qty<=0?old.filter(x=>x.key!==key):old.map(x=>x.key===key?{...x,quantity:Math.max(1,Math.min(20,qty))}:x));
 const cartValue={cart,add,update,clear:()=>setCart([]),count:cart.reduce((s,x)=>s+x.quantity,0),total:cartDisplayTotal(cart,products)};
 return <authContext.Provider value={auth}><catalogContext.Provider value={{products,brands,online,loading,refresh}}><cartContext.Provider value={cartValue}>{children}</cartContext.Provider></catalogContext.Provider></authContext.Provider>
}
function Header(){const {count}=useCart(),{user}=useAuth(),{brands}=useCatalog();return <Navbar count={count} user={user} brands={brands} fittingUrl={FITTING_URL}/> }
function Layout({children}){const {online,loading}=useCatalog();return <><Header/>{!loading&&!online&&<div className="demo-banner">DEMO MODE — API chưa kết nối. Bạn có thể khám phá giao diện với sản phẩm giả lập; đăng nhập và checkout sẽ cần backend.</div>}<main>{children}</main><Footer fittingUrl={FITTING_URL}/></>}
function Home(){const {products,brands}=useCatalog();return <Layout><HomePage products={products} brands={brands} fittingUrl={FITTING_URL}/></Layout>}
function Shop(){const {products,brands}=useCatalog();return <Layout><ShopPage products={products} brands={brands}/></Layout>}
function Brands(){const {brands}=useCatalog();return <Layout><section className="page-intro"><Eyebrow>THE LABELS / 001–003</Eyebrow><h1>Curated <em>identities.</em></h1><p>Concept labels for demonstration purposes. Replace only after verified supply and rights.</p></section><section className="section brands-page"><div className="brand-tiles">{brands.map((b,i)=><Link key={b.id} to={`/shop?brand=${b.slug}`} className={`brand-tile brand-tile-${i}`}><small>CONCEPT LABEL / 0{i+1}</small><b>{b.name}</b><p>{b.description}</p><span>EXPLORE THE COLLECTION ↗</span></Link>)}</div></section></Layout>}
function Product(){const {products,online,loading}=useCatalog(),{add}=useCart();return <Layout><ProductDetailPage products={products} online={online} loading={loading} addToCart={add} fittingUrl={FITTING_URL}/></Layout>}
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
function Account(){const {user,token,logout}=useAuth(),[orders,setOrders]=useState([]),[error,setError]=useState('');useEffect(()=>{request('/orders/mine',{token}).then(setOrders).catch(e=>setError(e.message))},[token]);return <Layout><section className="page-intro"><Eyebrow>MY KD ACCOUNT</Eyebrow><h1>Hello, <em>{user.name}.</em></h1><p>{user.email} · {user.role.toUpperCase()}</p><button className="text-button" onClick={logout}>Sign out →</button></section><section className="section account-orders"><h2>Your orders</h2>{error&&<p className="message-error">{error}</p>}{!orders.length&&<p>No orders yet.</p>}{orders.map(o=><div key={o.id} className="order-record"><div><b>ORDER #{o.id}</b><span>{new Date(o.created_at).toLocaleDateString('vi-VN')}</span><strong>{money(o.total)}</strong></div><span className="order-status">{o.status}</span><div className="order-line">{o.items.map((i,j)=><small key={j}>{i.product_name} · {i.size} × {i.quantity}</small>)}</div></div>)}{user.role==='admin'&&<Link className="button button-dark" to="/admin">OPEN ADMIN DASHBOARD <ArrowRight size={18}/></Link>}</section></Layout>}
function Checkout(){
 const {user,token}=useAuth(),{cart,total,clear}=useCart(),{products}=useCatalog();
 const navigate=useNavigate();
 const [form,setForm]=useState({recipient:user.name||'',phone:'',address:''});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const rows=cart.map(entry=>({...entry,displayProduct:resolveCartProduct(entry,products)}));
 async function submit(e){
  e.preventDefault();
  if(!cart.length)return;
  setBusy(true);setError('');
  try{
   const order=await request('/orders',{method:'POST',token,body:{
    ...form,items:cart.map(entry=>({variant_id:Number(entry.variant.id),quantity:entry.quantity}))
   }});
   clear();navigate('/order-success',{state:{id:order.id}});
  }catch(e){setError(e.message)}finally{setBusy(false);}
 }
 return <Layout>
  <section className="kd-checkout-intro">
   <nav className="kd-checkout-crumbs" aria-label="Checkout steps">
    <Link to="/cart">Shopping bag</Link><ChevronRight size={17}/><span aria-current="step">Checkout</span>
   </nav>
   <div className="kd-checkout-intro-row">
    <div><h1>Check<em>out.</em></h1>
     <p>Your selected items, delivery details and total — all in one place.</p>
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
    <div className="kd-checkout-form-heading"><Truck size={24}/><div><h2>Delivery information</h2><p>Enter the details needed for your demo delivery.</p></div></div>
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
     <textarea id="kd-address" required minLength={10} rows={4}
      autoComplete="street-address" value={form.address}
      onChange={e=>setForm({...form,address:e.target.value})}
      placeholder="Street address, ward, city"/>
    </label>
    <div className="kd-checkout-payment">
     <span>PAYMENT METHOD</span>
     <div><Truck size={20}/><strong>Cash on Delivery (COD)</strong><small>Demo only</small><Check size={19}/></div>
    </div>
    {error&&<div className="message-error" role="alert">{error}</div>}
    <button type="submit" className="button button-dark full-width kd-checkout-place-order" disabled={busy}>
     {busy?'PROCESSING…':'PLACE DEMO ORDER'} <ArrowRight size={19}/>
    </button>
    <p className="kd-checkout-demo-note">Demonstration only. Do not enter real personal contact or delivery details.</p>
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
function OrderSuccess(){return <Layout><div className="success-screen"><Check size={36}/><Eyebrow>ORDER CREATED</Eyebrow><h1>Thank you.</h1><p>Đơn hàng demo được tạo thành công. Bạn có thể kiểm tra trạng thái tại My Account.</p><Link className="button button-dark" to="/account">VIEW MY ORDERS <ArrowRight size={18}/></Link></div></Layout>}
function Admin(){const {token,user}=useAuth(),{refresh}=useCatalog();return <Layout><AdminPage user={user} token={token} request={request} refreshCatalog={refresh}/></Layout>}
function App(){return <Providers><BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/brands" element={<Brands/>}/><Route path="/product/:slug" element={<Product/>}/><Route path="/cart" element={<Cart/>}/><Route path="/login" element={<Login/>}/><Route path="/account" element={<RequireAuth><Account/></RequireAuth>}/><Route path="/checkout" element={<RequireAuth><Checkout/></RequireAuth>}/><Route path="/order-success" element={<RequireAuth><OrderSuccess/></RequireAuth>}/><Route path="/admin" element={<RequireAuth admin><Admin/></RequireAuth>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></BrowserRouter></Providers>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
