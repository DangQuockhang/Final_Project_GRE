import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function StoreBenefits(){return (
<section className="benefits"><div><ShieldCheck size={22}/><span>SUPPLIER TRANSPARENCY</span></div><div><Sparkles size={22}/><span>INTERACTIVE 3D FITTING</span></div><div><Truck size={22}/><span>CURATED SHOPPING EXPERIENCE</span></div></section>
)}
