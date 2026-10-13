import React from 'react';
import {motion,useReducedMotion} from 'framer-motion';

/**
 * Accessible, one-time scroll reveal. Honors OS Reduce Motion preference,
 * so the content remains fully visible without transitions.
 */
export default function Reveal({children,as='div',className='',delay=0,amount=0.12}){
 const reduced=useReducedMotion();
 const Component=as==='section'?motion.section:motion.div;
 return <Component className={className}
  initial={reduced?false:{opacity:0,y:24}}
  whileInView={{opacity:1,y:0}}
  viewport={{once:true,amount}}
  transition={{duration:reduced?0:0.65,delay:reduced?0:delay,ease:[0.22,1,0.36,1]}}>
   {children}
 </Component>;
}
