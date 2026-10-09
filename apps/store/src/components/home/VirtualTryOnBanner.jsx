import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ShieldCheck,Sparkles,Truck} from 'lucide-react';
import Eyebrow from '../common/Eyebrow.jsx';
import {ProductCard} from '../product/ProductCard.jsx';
export default function VirtualTryOnBanner({fittingUrl}){return (
<section className="studio-feature"><div className="studio-feature-art"><span className="art-ring"/><span className="art-head"/><span className="art-torso"/><span className="art-marker">3D / 360°</span></div><div className="studio-feature-content"><Eyebrow>INTRODUCING / KD FITTING STUDIO</Eyebrow><h2>Your fit.<br/><em>Before the fit.</em></h2><p>Explore a 3D mannequin, switch silhouettes and compare garment size on screen. A new way to explore your look, before adding anything to your bag.</p><p className="subnote">Early prototype: visual geometry and size guidance, not AI fit certification.</p><a className="button button-dark" href={fittingUrl} target="_blank" rel="noreferrer">ENTER THE FITTING STUDIO <ArrowUpRight size={18}/></a></div></section>
)}
