import React from 'react';
import {motion,useReducedMotion} from 'framer-motion';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function HeroSection({fittingUrl}){
 const reduced=useReducedMotion();
 return (
<section className="hero"><div className="hero-grain"/><div className="hero-top"><span>THE NEW STANDARD OF PERSONAL STYLE</span><span>ISSUE 001 / 2026</span></div><motion.div className="hero-copy" initial={reduced?false:{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:0.75,ease:[0.22,1,0.36,1]}}><Eyebrow>FASHION, RECONSIDERED</Eyebrow><h1>Wear what<br/><em>moves you.</em></h1><p>A considered edit of contemporary clothing and accessories. Discover pieces made for your own definition of style.</p><div className="hero-actions"><Link className="button button-light" to="/shop">DISCOVER THE EDIT <ArrowUpRight size={17}/></Link><a href={fittingUrl} className="text-link" target="_blank" rel="noreferrer">EXPLORE 3D FITTING <ArrowRight size={17}/></a></div></motion.div><motion.div className="hero-figure" initial={reduced?false:{opacity:0,x:24}} animate={{opacity:1,x:0}} transition={{duration:reduced?0:1,delay:0.12}}><div className="hero-figure-circle"/><div className="hero-figure-body"/><div className="hero-figure-jacket"/><div className="hero-figure-head"/></motion.div><div className="hero-bottom">NOT JUST WHAT YOU WEAR — HOW YOU FEEL. <span>SCROLL TO EXPLORE ↓</span></div></section>
)}
