import React, {useEffect, useState} from 'react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {ArrowUpRight, CircleUserRound, Menu, ShoppingBag, X} from 'lucide-react';

export default function Navbar({user, count, fittingUrl}) {
 const [open,setOpen]=useState(false);
 const location=useLocation();
 useEffect(()=>setOpen(false),[location.pathname,location.search]);
 useEffect(()=>{
  const close=e=>{if(e.key==='Escape')setOpen(false)};
  window.addEventListener('keydown',close);
  return ()=>window.removeEventListener('keydown',close);
 },[]);
 return <>
  <div className="announcement">CURATED BRANDS. CONSIDERED STYLE. <span>•</span> KD DESGIN — CONCEPT STORE</div>
  <header className="header">
   <Link to="/" className="logo" aria-label="KD Desgin home"><strong>KD</strong><span>DESGIN</span><small>CURATED FASHION</small></Link>
   <nav id="kd-main-nav" aria-label="Main navigation" className={open?'site-nav nav-open':'site-nav'}>
    <NavLink to="/shop">SHOP ALL</NavLink><NavLink to="/shop?category=tops">CLOTHING</NavLink>
    <NavLink to="/shop?category=accessories">ACCESSORIES</NavLink><NavLink to="/brands">OUR BRANDS</NavLink>
    <a className="studio-nav" href={fittingUrl} target="_blank" rel="noreferrer">3D FITTING STUDIO <ArrowUpRight size={12}/></a>
   </nav>
   <div className="header-actions">
    <Link to={user?'/account':'/login'} aria-label="Account"><CircleUserRound size={20}/></Link>
    <Link to="/cart" className="bag-trigger" aria-label={'Cart with '+count+' items'}><ShoppingBag size={20}/><b>{count}</b></Link>
    <button type="button" className="menu-toggle" aria-label={open?'Close menu':'Open menu'} aria-controls="kd-main-nav" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{open?<X/>:<Menu/>}</button>
   </div>
  </header>
 </>
}
