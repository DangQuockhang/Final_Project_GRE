import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import Reveal from '../common/Reveal.jsx';
import {editorialImages} from './editorialMedia.js';
export default function EditorialStory(){
 return <Reveal as="section" className="kd-editorial" amount={.1}>
  <div className="kd-editorial-image">
   <img src={editorialImages.editorial} loading="lazy" decoding="async" alt="Editorial fashion and contemporary styling" onError={e=>{e.currentTarget.style.opacity='0'}}/>
   <span>THE STYLE JOURNAL / 01</span>
  </div>
  <div className="kd-editorial-copy">
   <span className="kd-kicker"><span/> MORE THAN A WARDROBE</span>
   <h2>The art of<br/><em>everyday dressing.</em></h2>
   <p>Great style isn't about wearing more. It's about finding the pieces that feel right, work together and make every day your own.</p>
   <Link className="kd-link" to="/shop">Explore the collection <ArrowUpRight size={20}/></Link>
  </div>
 </Reveal>;
}
