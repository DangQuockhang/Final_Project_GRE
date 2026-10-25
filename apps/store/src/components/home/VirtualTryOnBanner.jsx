import React from 'react';
import {ArrowUpRight,Move3D} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
export default function VirtualTryOnBanner({fittingUrl}){
 return <Reveal as="section" className="kd-studio" amount={.08}>
  <div className="kd-studio-copy">
   <span className="kd-kicker"><span/> DISCOVER MORE WITH KD DESIGN</span>
   <h2>See the fit.<br/><em>Find your style.</em></h2>
   <p>Explore selected silhouettes on a 3D mannequin and discover proportions in an interactive fitting experience.</p>
   <p className="kd-studio-disclaimer">Prototype preview only; it does not guarantee real-world sizing or garment fit.</p>
   <a className="kd-btn kd-btn-light" href={fittingUrl} target="_blank" rel="noreferrer">Explore 3D Fitting <ArrowUpRight size={19}/></a>
  </div>
  <div className="kd-studio-visual" aria-hidden="true">
   <div className="kd-studio-orbit"><span/><span/></div>
   <div className="kd-studio-outline"><div className="kd-studio-head"/><div className="kd-studio-torso"/></div>
   <span className="kd-studio-corner">KD / 3D STUDIO</span>
   <Move3D className="kd-studio-icon" size={31} strokeWidth={1}/>
  </div>
 </Reveal>;
}
