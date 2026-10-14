import React,{useEffect,useState} from 'react';
import {Link,NavLink,useLocation,useNavigate} from 'react-router-dom';
import {ArrowUpRight,CircleUserRound,Menu,Search,ShoppingBag,X} from 'lucide-react';

export default function Navbar({user,count,fittingUrl}){
 const [open,setOpen]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [scrolled,setScrolled]=useState(false);
 const location=useLocation(),navigate=useNavigate();
 useEffect(()=>{
  const scroll=()=>setScrolled(window.scrollY>24);
  scroll();window.addEventListener('scroll',scroll,{passive:true});
  return ()=>window.removeEventListener('scroll',scroll);
 },[]);
 useEffect(()=>{setOpen(false);setSearchOpen(false)},[location.pathname,location.search]);
 useEffect(()=>{
  const close=e=>{if(e.key==='Escape'){setOpen(false);setSearchOpen(false)}};
  window.addEventListener('keydown',close);
  return ()=>window.removeEventListener('keydown',close);
 },[]);
 function submitSearch(e){
  e.preventDefault();
  const trimmed=query.trim();
  if(!trimmed)return;
  navigate('/shop?q='+encodeURIComponent(trimmed));
  setSearchOpen(false);setOpen(false);
 }
 return <>
  <div className="announcement kd26-announcement">
   <span>THE EVERYDAY EDIT</span><span className="kd26-announcement-center">CONTEMPORARY STYLE, THOUGHTFULLY CURATED</span><span>EST. KD DESIGN / 2026</span>
  </div>
  <header className={scrolled?'header header-scrolled kd26-header':'header kd26-header'}>
   <Link to="/" className="logo kd26-logo" aria-label="KD DESIGN homepage"><strong>KD</strong><span>DESIGN</span><small>CURATED FASHION</small></Link>
   <nav id="kd-main-nav" aria-label="Main navigation" className={open?'site-nav nav-open':'site-nav'}>
    <NavLink to="/shop">SHOP ALL</NavLink>
    <NavLink to="/shop?category=tops">CLOTHING</NavLink>
    <NavLink to="/shop?category=outerwear">OUTERWEAR</NavLink>
    <NavLink to="/shop?category=accessories">ACCESSORIES</NavLink>
    <NavLink to="/brands">BRANDS</NavLink>
    {user?.role==='admin'&&<NavLink to="/admin">ADMIN</NavLink>}
    <a className="studio-nav" href={fittingUrl} target="_blank" rel="noreferrer">3D FITTING <ArrowUpRight size={17}/></a>
   </nav>
   <div className="header-actions kd26-header-actions">
    <button type="button" className="kd26-icon-button" onClick={()=>{setSearchOpen(v=>!v);setOpen(false)}} aria-label={searchOpen?'Close search':'Search products'} aria-expanded={searchOpen} aria-controls="kd26-header-search">{searchOpen?<X size={23}/>:<Search size={23}/>}</button>
    <Link to={user?'/account':'/login'} aria-label="Account"><CircleUserRound size={23}/></Link>
    <Link to="/cart" className="bag-trigger" aria-label={'Shopping bag with '+count+' items'}><ShoppingBag size={23}/><b>{count}</b></Link>
    <button type="button" className="menu-toggle" aria-label={open?'Close menu':'Open menu'} aria-controls="kd-main-nav" aria-expanded={open} onClick={()=>{setOpen(o=>!o);setSearchOpen(false)}}>{open?<X size={25}/>:<Menu size={25}/>}</button>
   </div>
   {searchOpen&&<form id="kd26-header-search" className="kd26-search-panel" role="search" onSubmit={submitSearch}>
    <label htmlFor="kd26-search-input">Find your next favorite</label>
    <div><Search size={21}/><input autoFocus id="kd26-search-input" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, brands or styles…" required/><button type="submit" className="kd26-search-submit">Search <ArrowUpRight size={18}/></button></div>
   </form>}
  </header>
 </>;
}
