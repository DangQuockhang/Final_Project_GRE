import React,{useEffect,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {ArrowUpRight,ChevronDown,CircleUserRound,Menu,Search,Settings,ShoppingBag,X} from 'lucide-react';

const collections={
 ACCESSORIES:[['Glasses','accessories'],['Cap','accessories'],['Bag','accessories'],['Belt','accessories'],['Watches','accessories']],
 BAGS:[['Crossbody','accessories'],['Tote Bag','accessories'],['Mini Bag','accessories'],['Backpack','accessories']],
 CLOTHING:[['T-Shirt','tops'],['Polo','tops'],['Shirt','tops'],['Hoodie','tops'],['Sweater','tops'],['Jacket','outerwear'],['Cardigan','outerwear'],['Jeans','bottoms'],['Pants','bottoms']],
 SHOES:[['Sneakers','footwear'],['Slides','footwear'],['Loafers','footwear'],['Boots','footwear'],['Sandals','footwear']]
};
const bandDefs=[['A – B',/^[A-B]/i],['C – F',/^[C-F]/i],['G – L',/^[G-L]/i],['M – P',/^[M-P]/i],['R – Z',/^[R-Z]/i],['0 – 9',/^\d/]];
export default function Navbar({user,count,fittingUrl,brands=[]}){
 const [menu,setMenu]=useState(''),[mobile,setMobile]=useState(false),[searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState(''),[scrolled,setScrolled]=useState(false);
 const location=useLocation(),nav=useNavigate();
 useEffect(()=>{setMenu('');setMobile(false);setSearchOpen(false)},[location.pathname,location.search]);
 useEffect(()=>{
  const scroll=()=>setScrolled(window.scrollY>24);
  const esc=e=>{if(e.key==='Escape'){setMenu('');setSearchOpen(false);setMobile(false);}};
  scroll();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('keydown',esc);
  return ()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('keydown',esc)};
 },[]);
 const go=url=>{nav(url);setMenu('');setMobile(false);setSearchOpen(false)};
 const toggle=which=>{setSearchOpen(false);setMenu(prev=>prev===which?'':which)};
 const brandGroups=bandDefs.map(([label,pattern])=>({label,items:brands.filter(b=>pattern.test(b.name))})).filter(g=>g.items.length);
 function submitSearch(e){e.preventDefault();if(!query.trim())return;go('/shop?q='+encodeURIComponent(query.trim()));}
 return <>
  <div className="announcement kd-retail-announcement"><span>THE EVERYDAY EDIT</span><span>CONTEMPORARY STYLE, THOUGHTFULLY CURATED</span><span>KD DESIGN / 2026</span></div>
  <header className={'header kd-retail-header'+(scrolled?' header-scrolled':'')}>
   <div className="kd-retail-header-row">
    <Link className="logo kd-retail-logo" to="/" aria-label="KD DESIGN homepage"><strong>KD</strong> DESIGN <small>CURATED FASHION</small></Link>
    <nav className={'kd-retail-nav'+(mobile?' is-mobile-open':'')} aria-label="Main navigation">
      <button type="button" aria-expanded={menu==='collections'} aria-controls="kd-retail-collections" className={menu==='collections'?'on':''} onClick={()=>toggle('collections')}>COLLECTIONS <ChevronDown size={17}/></button>
      <button type="button" aria-expanded={menu==='brands'} aria-controls="kd-retail-brands" className={menu==='brands'?'on':''} onClick={()=>toggle('brands')}>BRANDS <ChevronDown size={17}/></button>
      <Link to="/shop">ALL PRODUCTS</Link>
      <Link className="kd-retail-sale-link" to="/shop?sale=1">SALE</Link>
      {user?.role==='admin'&&<Link to="/admin">ADMIN</Link>}
      <a className="kd-retail-studio" href={fittingUrl} target="_blank" rel="noreferrer">3D FITTING <ArrowUpRight size={16}/></a>
    </nav>
    <div className="kd-retail-actions">
      <button type="button" className="kd-retail-icon" aria-label={searchOpen?'Close search':'Search products'} aria-expanded={searchOpen} onClick={()=>{setSearchOpen(s=>!s);setMenu('')}}>{searchOpen?<X size={27}/>:<Search size={27}/>}</button>
      <Link className="kd-retail-icon" aria-label="Account" to={user?'/account':'/login'}><CircleUserRound size={27}/></Link>
      <Link className="kd-retail-icon kd-retail-bag" aria-label={'Shopping bag with '+count+' items'} to="/cart"><ShoppingBag size={27}/><b>{count}</b></Link>
      {user?.role==='admin'&&<Link className="kd-retail-icon kd-retail-settings" title="Admin settings" aria-label="Admin settings" to="/admin"><Settings size={25}/></Link>}
      <button className="kd-retail-icon kd-retail-hamburger" aria-label={mobile?'Close navigation':'Open navigation'} aria-expanded={mobile} onClick={()=>{setMobile(v=>!v);setMenu('')}}>{mobile?<X size={28}/>:<Menu size={28}/>}</button>
    </div>
   </div>
   {menu&&<button className="kd-retail-menu-scrim" type="button" tabIndex={-1} aria-label="Close menu" onClick={()=>setMenu('')}/>}
   {menu==='collections'&&<div id="kd-retail-collections" className="kd-retail-mega" role="region" aria-label="Collections directory">
     <div className="kd-retail-mega-columns">
      {Object.entries(collections).map(([title,items])=><div className="kd-retail-mega-column" key={title}>
       <h3>{title}</h3>
       {items.map(([label,category])=><button key={label} type="button" onClick={()=>go('/shop?category='+encodeURIComponent(category)+'&type='+encodeURIComponent(label))}>{label}</button>)}
      </div>)}
     </div>
     <button className="kd-retail-mega-all" type="button" onClick={()=>go('/shop')}>VIEW ALL PRODUCTS <ArrowUpRight size={18}/></button>
   </div>}
   {menu==='brands'&&<div id="kd-retail-brands" className="kd-retail-mega" role="region" aria-label="Brands A to Z">
     <div className="kd-retail-mega-columns kd-retail-mega-brands">
      {brandGroups.map(group=><div key={group.label} className="kd-retail-mega-column"><h3>{group.label}</h3>
        {group.items.map(b=><button key={b.id} type="button" onClick={()=>go('/shop?brand='+encodeURIComponent(b.slug))}>{b.name}</button>)}</div>)}
      {brandGroups.length===0&&<div className="kd-retail-mega-column">Brands will appear when the catalog loads.</div>}
     </div>
     <button className="kd-retail-mega-all" type="button" onClick={()=>go('/brands')}>EXPLORE BRANDS <ArrowUpRight size={18}/></button>
   </div>}
   {searchOpen&&<form className="kd26-search-panel kd-retail-search" role="search" onSubmit={submitSearch}><label htmlFor="kd-retail-query">Find your next favorite</label><div><Search size={22}/><input id="kd-retail-query" autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, brands or styles…" required/><button className="kd26-search-submit">Search <ArrowUpRight size={17}/></button></div></form>}
  </header>
 </>;
}
