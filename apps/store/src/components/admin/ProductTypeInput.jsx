import React,{useId,useState} from 'react';
import {collectionSuggestions,normalizeCollectionName} from '../../utils/collections.js';

export default function ProductTypeInput({value,onChange,category,collections=[],status='draft',disabled=false}){
 const id=useId(),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const matches=collectionSuggestions(collections,category,value);
 const normalized=normalizeCollectionName(value);
 const existing=collections.find(c=>c.category===category&&c.name.toLowerCase()===normalized.toLowerCase());
 function choose(collection){onChange(collection.name);setOpen(false);setActive(-1);}
 function keydown(event){
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();setOpen(true);
   setActive(previous=>matches.length?(previous<0?(event.key==='ArrowDown'?0:matches.length-1):(previous+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length):-1);
  }else if(event.key==='Enter'&&open&&active>=0&&matches[active]){
   event.preventDefault();choose(matches[active]);
  }else if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);}
 }
 return <div className="kd-product-type-field">
  <label htmlFor={id}>PRODUCT TYPE</label>
  <input id={id} value={value} maxLength={60} disabled={disabled} autoComplete="off"
   role="combobox" aria-autocomplete="list" aria-expanded={open&&matches.length>0}
   aria-controls={id+'-options'} aria-activedescendant={open&&matches[active]?id+'-option-'+active:undefined}
   onFocus={()=>setOpen(true)} onKeyDown={keydown}
   onChange={event=>{onChange(event.target.value);setActive(-1);setOpen(true);}}
   onBlur={()=>{onChange(normalized);setOpen(false);setActive(-1);}}
   placeholder="Type or choose, e.g. T-shirt"/>
  {open&&matches.length>0&&<ul id={id+'-options'} role="listbox" className="kd-type-options">
   {matches.map((collection,index)=><li key={collection.id} id={id+'-option-'+index} role="option"
    aria-selected={index===active} className={index===active?'is-active':''}
    onMouseDown={event=>event.preventDefault()} onClick={()=>choose(collection)}>
     {collection.name}{collection.hidden&&<small>Hidden</small>}
   </li>)}
  </ul>}
  <small className="kd-type-hint">{!normalized?'Choose an existing collection or enter a new name.':
   existing?'Uses existing collection: '+existing.name+(existing.hidden?' (hidden from storefront).':'.'):
   'New collection: '+normalized+' — created when you save the product.'}</small>
  {normalized&&<small className="kd-type-hint" role="status">
   {status!=='active'?'This product is '+status.toUpperCase()+'. Its Product Type is saved in Admin → Collections, but this product is not visible to customers. The storefront menu only shows collections with at least one ACTIVE product.':
    existing?.hidden?'This collection is hidden from customers. Use SHOW in Admin → Collections to display it.':
    'After saving, this ACTIVE product makes the collection available in the storefront menu.'}
  </small>}
 </div>;
}
