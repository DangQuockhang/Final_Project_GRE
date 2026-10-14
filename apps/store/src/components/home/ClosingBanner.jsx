import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
export default function ClosingBanner(){
 return <Reveal as="section" className="kd26-close" amount={.1}>
  <div><span>THE KD DESIGN EDIT</span><h2>Good style is <em>personal.</em></h2><p>Discover your next favorite and make the everyday yours.</p></div>
  <Link to="/shop" className="kd26-btn kd26-btn-dark">Explore the shop <ArrowUpRight size={19}/></Link>
 </Reveal>;
}
