import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function HeroSection({fittingUrl}){return (
<section className="hero"><div className="hero-grain"/><div className="hero-top"><span>THE NEW STANDARD OF PERSONAL STYLE</span><span>ISSUE 001 / 2026</span></div><div className="hero-copy"><Eyebrow>FASHION, RECONSIDERED</Eyebrow><h1>Wear what<br/><em>moves you.</em></h1><p>A considered edit of contemporary clothing and accessories. Discover pieces made for your own definition of style.</p><div className="hero-actions"><Link className="button button-light" to="/shop">DISCOVER THE EDIT <ArrowUpRight size={17}/></Link><a href={fittingUrl} className="text-link" target="_blank" rel="noreferrer">EXPLORE 3D FITTING <ArrowRight size={17}/></a></div></div><div className="hero-figure"><div className="hero-figure-circle"/><div className="hero-figure-body"/><div className="hero-figure-jacket"/><div className="hero-figure-head"/></div><div className="hero-bottom">NOT JUST WHAT YOU WEAR — HOW YOU FEEL. <span>SCROLL TO EXPLORE ↓</span></div></section>
)}
