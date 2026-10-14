import React from 'react';
import {BadgeCheck,Layers3,ScanFace} from 'lucide-react';

export default function StoreBenefits(){
 const items=[
  {Icon:Layers3,title:'Curated collections',caption:'Discover considered everyday style'},
  {Icon:BadgeCheck,title:'Multi-brand discovery',caption:'Explore distinctive fashion labels'},
  {Icon:ScanFace,title:'Interactive 3D preview',caption:'Discover selected pieces in 3D'}
 ];
 return <section className="kd26-benefits" aria-label="Shopping experience">
  {items.map(({Icon,title,caption})=><div className="kd26-benefit" key={title}>
   <Icon size={25} strokeWidth={1.45} aria-hidden="true"/>
   <div><strong>{title}</strong><span>{caption}</span></div>
  </div>)}
 </section>;
}
