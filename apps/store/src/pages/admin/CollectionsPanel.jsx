import React,{useState} from 'react';
export default function CollectionsPanel({collections=[],api,perform,busy}){
 const [search,setSearch]=useState('');
 const rows=collections.filter(c=>(c.name+' '+c.category).toLowerCase().includes(search.trim().toLowerCase()));
 function remove(collection){
  if(!window.confirm('Delete the empty collection "'+collection.name+'"?'))return;
  perform(()=>api('/admin/collections/'+collection.id,{method:'DELETE'}),'Collection deleted.');
 }
 return <section className="kd-admin-panel">
  <div className="kd-admin-panel-header"><div><h2>Collections</h2>
   <p>Collections are created from Product Type when a product is saved. Empty collections do not appear in the customer menu.</p></div></div>
  <input aria-label="Search collections" placeholder="Search name or category…" value={search} onChange={e=>setSearch(e.target.value)}/>
  <div className="kd-collection-list">
   {rows.map(c=><article key={c.id} className="kd-collection-row">
    <div><h3>{c.name}</h3><small>{c.category} · {c.total_count} products · {c.active_count} active</small>
     <p>{c.hidden?'Hidden':Number(c.active_count)>0?'Visible':'Automatically hidden — no active products'}</p></div>
    <div className="kd-collection-actions">
     <button type="button" className="border-button" disabled={busy}
      onClick={()=>perform(()=>api('/admin/collections/'+c.id,{method:'PATCH',body:{hidden:!c.hidden}}),'Collection visibility updated.')}>{c.hidden?'SHOW':'HIDE'}</button>
     <button type="button" className="border-button" disabled={busy||Number(c.total_count)>0}
      title={Number(c.total_count)>0?'Move or remove all linked products before deleting. You can hide this collection now.':'Delete empty collection'}
      onClick={()=>remove(c)}>DELETE</button>
    </div>
   </article>)}
   {!rows.length&&<p>No collections found. Save a product with a Product Type to create one.</p>}
  </div>
 </section>;
}
