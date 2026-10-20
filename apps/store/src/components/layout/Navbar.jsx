import React,{useEffect,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {ArrowUpRight,ChevronDown,CircleUserRound,Menu,Search,Settings,ShoppingBag,X} from 'lucide-react';

const collections={
 ACCESSORIES:[['Bracelet','accessories'],['Necklace','accessories'],['Earring','accessories'],['Bucket Hat','accessories'],['Cap','accessories'],['Belt','accessories'],['Glasses','accessories'],['Watches','accessories'],['Hair Accessories','accessories'],['Wallet','accessories']],
 BAGS:[['Clutch','bags'],['Crossbody Bag','bags'],['Handle Bag','bags'],['Messenger Bag','bags'],['Mini Bag','bags'],['Shoulder Bag','bags'],['Tote Bag','bags'],['Backpack','bags']],
 CLOTHING:[['Cardigan','clothing'],['T-Shirt','clothing'],['Hoodie','clothing'],['Polo','clothing'],['Jacket','clothing'],['Shirt','clothing'],['Shorts','clothing'],['Skirt','clothing'],['Sweater','clothing'],['Jeans','clothing'],['Pants','clothing']],
 SHOES:[['Sneakers','shoes'],['Slides','shoes'],['Slippers','shoes'],['Slip-On','shoes'],['Loafers','shoes'],['Pumps','shoes'],['Mules','shoes'],['Boots','shoes'],['Sandals','shoes']]
};
const bandDefs=[['A – B',/^[A-B]/i],['C – F',/^[C-F]/i],['G – L',/^[G-L]/i],['M – Q',/^[M-Q]/i],['R – Z',/^[R-Z]/i],['0 – 9',/^\d/]];
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
 const toggle=which=>{setSearchOpen(false);setMobile(false);setMenu(prev=>prev===which?'':which)};
 const brandGroups=bandDefs.map(([label,pattern])=>({label,items:brands.filter(b=>pattern.test(b.name))})).filter(g=>g.items.length);
 function submitSearch(e){e.preventDefault();if(!query.trim())return;go('/shop?q='+encodeURIComponent(query.trim()));}
 return <>
  <header className={'header kd-retail-header'+(scrolled?' header-scrolled':'')}>
   <div className="kd-retail-header-row">
    <Link className="logo kd-retail-logo" to="/" aria-label="KD DESIGN homepage"><strong>KD</strong> DESIGN <small>CURATED FASHION</small></Link>
    <nav className={'kd-retail-nav'+(mobile?' is-mobile-open':'')} aria-label="Main navigation">
      <button type="button" onMouseEnter={()=>{if(window.matchMedia('(hover:hover) and (min-width:1431px)').matches)setMenu('collections')}} aria-expanded={menu==='collections'} aria-controls="kd-retail-collections" className={menu==='collections'?'on':''} onClick={()=>toggle('collections')}>COLLECTIONS <ChevronDown size={20}/></button>
      <button type="button" onMouseEnter={()=>{if(window.matchMedia('(hover:hover) and (min-width:1431px)').matches)setMenu('brands')}} aria-expanded={menu==='brands'} aria-controls="kd-retail-brands" className={menu==='brands'?'on':''} onClick={()=>toggle('brands')}>BRANDS <ChevronDown size={20}/></button>
      <Link to="/shop">ALL PRODUCTS</Link>
      <Link className="kd-retail-sale-link" to="/shop?sale=1">SALE</Link>
      {user?.role==='admin'&&<Link to="/admin">ADMIN</Link>}
    </nav>
    <div className="kd-retail-actions">
      <button type="button" className="kd-retail-icon" aria-label={searchOpen?'Close search':'Search products'} aria-expanded={searchOpen} onClick={()=>{setSearchOpen(s=>!s);setMenu('')}}>{searchOpen?<X size={27}/>:<Search size={30}/>}</button>
      <Link className="kd-retail-icon" aria-label="Account" to={user?'/account':'/login'}><CircleUserRound size={30}/></Link>
      <Link className="kd-retail-icon kd-retail-bag" aria-label={'Shopping bag with '+count+' items'} to="/cart"><ShoppingBag size={30}/><b>{count}</b></Link>
      {user?.role==='admin'&&<Link className="kd-retail-icon kd-retail-settings" title="Admin settings" aria-label="Admin settings" to="/admin"><Settings size={29}/></Link>}
      <button className="kd-retail-icon kd-retail-hamburger" aria-label={mobile?'Close navigation':'Open navigation'} aria-expanded={mobile} onClick={()=>{setMobile(v=>!v);setMenu('')}}>{mobile?<X size={28}/>:<Menu size={30}/>}</button>
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
