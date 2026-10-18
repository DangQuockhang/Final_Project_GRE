import React from 'react';
import {motion,useReducedMotion} from 'framer-motion';
import {Link} from 'react-router-dom';
import {ArrowDownRight,ArrowUpRight} from 'lucide-react';
import {editorialImages} from './editorialMedia.js';

export default function HeroSection(){
 const reduced=useReducedMotion();
 return <section className="kd26-hero" aria-labelledby="kd26-hero-title">
  <div className="kd26-hero-copy">
   <motion.div initial={reduced?false:{opacity:0,y:24}} animate={{opacity:1,y:0}}
    transition={{duration:reduced?0:.72,ease:[.22,1,.36,1]}}>
    <h1 id="kd26-hero-title">Discover your<br/><em>signature style.</em></h1>
    <p>Discover contemporary clothing and accessories from distinctive fashion labels. Thoughtful pieces for every way you show up.</p>
    <div className="kd26-hero-cta">
     <Link to="/shop" className="kd26-btn kd26-btn-dark">Shop the collection <ArrowUpRight size={20}/></Link>
     <Link to="/brands" className="kd26-link">Explore brands <ArrowUpRight size={18}/></Link>
    </div>
   </motion.div>
   <div className="kd26-hero-bottom">
    <span>CURATED FASHION · KD DESIGN</span>
    <a href="#kd26-categories">DISCOVER MORE <ArrowDownRight size={16}/></a>
   </div>
  </div>
  <motion.div className="kd26-hero-media"
   initial={reduced?false:{opacity:0,scale:1.045}} animate={{opacity:1,scale:1}}
   transition={{duration:reduced?0:1.05,delay:reduced?0:.15,ease:[.22,1,.36,1]}}>
   <img src={editorialImages.hero} alt="Contemporary editorial fashion outfit" fetchPriority="high" decoding="async"
    onError={e=>{e.currentTarget.style.opacity='0'}}/>
  </motion.div>
 </section>;
}
