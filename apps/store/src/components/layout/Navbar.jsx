import React,{useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {ArrowUpRight,ChevronDown,CircleUserRound,Menu,Search,Settings,ShoppingBag,X} from 'lucide-react';
import {groupCollections} from '../../utils/collections.js';
import {isOutsidePanel} from '../../utils/navigationMenu.js';


const bandDefs=[['A – B',/^[A-B]/i],['C – F',/^[C-F]/i],['G – L',/^[G-L]/i],['M – Q',/^[M-Q]/i],['R – Z',/^[R-Z]/i],['0 – 9',/^\d/]];
export default function Navbar({user,count,fittingUrl,brands=[],collections=[]}){
 const [menu,setMenu]=useState(''),[mobile,setMobile]=useState(false),[searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState(''),[scrolled,setScrolled]=useState(false);
 const location=useLocation(),nav=useNavigate();
 const menuRef=useRef(menu);
 menuRef.current=menu;
 const collectionsTrigger=useRef(null),brandsTrigger=useRef(null),megaPanel=useRef(null);
 const searchTrigger=useRef(null),searchPanel=useRef(null);
 const mobileTrigger=useRef(null),mobilePanel=useRef(null);
 useEffect(()=>{setMenu('');setMobile(false);setSearchOpen(false)},[location.pathname,location.search]);
 useEffect(()=>{
  const scroll=()=>setScrolled(window.scrollY>24);
  const esc=e=>{if(e.key==='Escape'){
   if(menuRef.current==='collections')collectionsTrigger.current?.focus();
   else if(menuRef.current==='brands')brandsTrigger.current?.focus();
   setMenu('');setSearchOpen(false);setMobile(false);
  }};
  scroll();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('keydown',esc);
  return ()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('keydown',esc)};
 },[]);
 // A real click/tap is the only action that opens the directories.
 // Clicking any element outside the open panel/trigger closes it without
 // blocking the underlying page action (no click-eating full-screen scrim).
 useEffect(()=>{
  if(!menu&&!searchOpen&&!mobile)return;
  const dismissOnOutside=e=>{
   if(menu){
    const trigger=menu==='collections'?collectionsTrigger.current:brandsTrigger.current;
    if(isOutsidePanel(e.target,trigger,megaPanel.current))setMenu('');
   }
   if(searchOpen&&isOutsidePanel(e.target,searchTrigger.current,searchPanel.current))setSearchOpen(false);
   if(mobile&&isOutsidePanel(e.target,mobileTrigger.current,mobilePanel.current))setMobile(false);
  };
  document.addEventListener('pointerdown',dismissOnOutside);
  return ()=>document.removeEventListener('pointerdown',dismissOnOutside);
 },[menu,searchOpen,mobile]);
 const go=url=>{nav(url);setMenu('');setMobile(false);setSearchOpen(false)};
 const toggle=which=>{setSearchOpen(false);setMobile(false);setMenu(prev=>prev===which?'':which)};
 const collectionGroups=groupCollections(collections);
 const brandGroups=bandDefs.map(([label,pattern])=>({label,items:brands.filter(b=>pattern.test(b.name))})).filter(g=>g.items.length);
 function submitSearch(e){e.preventDefault();if(!query.trim())return;go('/shop?q='+encodeURIComponent(query.trim()));}
 return <>
  <header className={'header kd-retail-header'+(scrolled?' header-scrolled':'')}>
   <div className="kd-retail-header-row">
    <Link className="logo kd-retail-logo" to="/" aria-label="KD DESIGN homepage"><strong>KD</strong> DESIGN <small>CURATED FASHION</small></Link>
    <nav ref={mobilePanel} className={'kd-retail-nav'+(mobile?' is-mobile-open':'')} aria-label="Main navigation">
      <button ref={collectionsTrigger} type="button" aria-haspopup="true" aria-expanded={menu==='collections'} aria-controls="kd-retail-collections" className={menu==='collections'?'on':''} onClick={()=>toggle('collections')}>COLLECTIONS <ChevronDown size={20}/></button>
      <button ref={brandsTrigger} type="button" aria-haspopup="true" aria-expanded={menu==='brands'} aria-controls="kd-retail-brands" className={menu==='brands'?'on':''} onClick={()=>toggle('brands')}>BRANDS <ChevronDown size={20}/></button>
      <Link to="/shop">ALL PRODUCTS</Link>
      <Link className="kd-retail-sale-link" to="/shop?sale=1">SALE</Link>
      {user?.role==='admin'&&<Link to="/admin">ADMIN</Link>}
    </nav>
    <div className="kd-retail-actions">
      <button ref={searchTrigger} type="button" className="kd-retail-icon" aria-label={searchOpen?'Close search':'Search products'} aria-expanded={searchOpen} onClick={()=>{setSearchOpen(s=>!s);setMenu('')}}>{searchOpen?<X size={27}/>:<Search size={30}/>}</button>
      <Link className="kd-retail-icon" aria-label="Account" to={user?'/account':'/login'}><CircleUserRound size={30}/></Link>
      <Link className="kd-retail-icon kd-retail-bag" aria-label={'Shopping bag with '+count+' items'} to="/cart"><ShoppingBag size={30}/><b>{count}</b></Link>
      {user?.role==='admin'&&<Link className="kd-retail-icon kd-retail-settings" title="Admin settings" aria-label="Admin settings" to="/admin"><Settings size={29}/></Link>}
      <button ref={mobileTrigger} className="kd-retail-icon kd-retail-hamburger" aria-label={mobile?'Close navigation':'Open navigation'} aria-expanded={mobile} onClick={()=>{setMobile(v=>!v);setMenu('')}}>{mobile?<X size={28}/>:<Menu size={30}/>}</button>
    </div>
   </div>
   {menu==='collections'&&<div ref={megaPanel} id="kd-retail-collections" className="kd-retail-mega" role="region" aria-label="Collections directory">
     <div className="kd-retail-mega-columns">
      {!collectionGroups.length&&<p>No collections available yet.</p>}
      {collectionGroups.map(({category,name:title,items})=><div className="kd-retail-mega-column" key={title}>
       <h3>{title}</h3>
       {items.map(collection=><button key={collection.id} type="button" onClick={()=>go('/shop?category='+encodeURIComponent(category)+'&type='+encodeURIComponent(collection.name))}>{collection.name}</button>)}
      </div>)}
     </div>
     <button className="kd-retail-mega-all" type="button" onClick={()=>go('/shop')}>VIEW ALL PRODUCTS <ArrowUpRight size={18}/></button>
   </div>}
   {menu==='brands'&&<div ref={megaPanel} id="kd-retail-brands" className="kd-retail-mega" role="region" aria-label="Brands A to Z">
     <div className="kd-retail-mega-columns kd-retail-mega-brands">
      {brandGroups.map(group=><div key={group.label} className="kd-retail-mega-column"><h3>{group.label}</h3>
        {group.items.map(b=><button key={b.id} type="button" onClick={()=>go('/shop?brand='+encodeURIComponent(b.slug))}>{b.name}</button>)}</div>)}
      {brandGroups.length===0&&<div className="kd-retail-mega-column">Brands will appear when the catalog loads.</div>}
     </div>
     <button className="kd-retail-mega-all" type="button" onClick={()=>go('/brands')}>EXPLORE BRANDS <ArrowUpRight size={18}/></button>
   </div>}
   {searchOpen&&<form ref={searchPanel} className="kd26-search-panel kd-retail-search" role="search" onSubmit={submitSearch}><label htmlFor="kd-retail-query">Find your next favorite</label><div><Search size={22}/><input id="kd-retail-query" autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, brands or styles…" required/><button className="kd26-search-submit">Search <ArrowUpRight size={17}/></button></div></form>}
  </header>
 </>;
}
