import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Instagram} from 'lucide-react';
export default function Footer({fittingUrl}){
 return <footer className="footer kd-footer">
  <div className="kd-footer-intro"><span>YOUR STYLE, YOUR WAY</span><p>Less noise. More pieces you love. Discover a considered approach to everyday dressing.</p><Link to="/shop">Explore the collection <ArrowUpRight size={19}/></Link></div>
  <div className="footer-main">
   <div><div className="footer-logo">KD <span>DESIGN</span></div><p>Contemporary multi-brand fashion, curated for your everyday. A student-built e-commerce concept.</p></div>
   <div><b>EXPLORE</b><Link to="/shop">Shop all</Link><Link to="/shop?category=clothing">Clothing</Link><Link to="/shop?category=bags">Bags</Link><Link to="/shop?category=shoes">Shoes</Link><Link to="/shop?category=accessories">Accessories</Link></div>
   <div><b>DISCOVER</b><Link to="/brands">Our brands</Link><Link to="/account">My account</Link></div>
   <div><b>HELP & INFORMATION</b><Link to="/cart">Shopping bag</Link><span>Support experience in development</span><div className="social-mark"><Instagram size={19}/><span>Social updates · Coming soon</span></div></div>
  </div>
  <div className="footer-base">© 2026 KD DESIGN · CURATED FASHION <span>ORIGINAL MULTI-BRAND CONCEPT STORE</span></div>
 </footer>;
}
