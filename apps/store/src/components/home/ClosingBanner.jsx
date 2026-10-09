import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function ClosingBanner(){return (
<section className="closing-banner"><div><span>YOUR STYLE IS NOT A CATEGORY.</span><h2>Make it <em>yours.</em></h2></div><Link className="button button-light" to="/shop">SHOP THE COLLECTION <ArrowRight size={18}/></Link></section>
)}
