import React,{useState} from 'react';
import {money} from '@kd/catalog';
import {ORDER_TRANSITIONS} from '../../utils/adminValidation.js';
export default function OrdersPanel({orders,api,perform,busy}){
  const [filter,setFilter]=useState('all');
  const visible=orders.filter(o=>filter==='all'||o.status===filter);
  async function changeStatus(order,next){
    if(next==='CANCELLED'&&!window.confirm('Cancel order #'+order.id+'? Reserved stock will be restored.'))return;
    await perform(()=>api('/admin/orders/'+order.id+'/status',{method:'PATCH',body:{status:next}}),'Order #'+order.id+' updated to '+next+'.');
  }
  return <section className="kd-admin-panel" aria-labelledby="orders-title">
    <div className="kd-admin-panel-header"><div><h2 id="orders-title">Order Management</h2><p>Process COD demo orders according to valid status transitions.</p></div><span>{orders.length} orders</span></div>
    <div className="kd-admin-filter-row"><label>STATUS <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All orders</option>{['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s=><option key={s}>{s}</option>)}</select></label></div>
    <div className="admin-table">{visible.length===0&&<div className="kd-admin-placeholder">No orders in this category.</div>}
      {visible.map(o=><article className="admin-order kd-admin-order" key={o.id}>
        <div><b>ORDER #{o.id} — {o.recipient}</b><small>{o.email} · {o.phone} · {new Date(o.created_at).toLocaleString('vi-VN')}</small><span>{o.address}</span><strong>{money(o.total)}</strong></div>
        <div className="kd-order-actions"><span className="order-status">{o.status}</span>
          {(ORDER_TRANSITIONS[o.status]||[]).length>0&&<select aria-label={'Update order '+o.id} disabled={busy} value="" onChange={e=>{if(e.target.value)changeStatus(o,e.target.value);}}>
            <option value="">Change status…</option>{ORDER_TRANSITIONS[o.status].map(s=><option key={s} value={s}>{s}</option>)}
          </select>}
        </div>
        <div className="order-line">{(o.items||[]).map((item,index)=><small key={index}>{item.product_name} · {item.size} × {item.quantity}</small>)}</div>
      </article>)}
    </div>
  </section>;
}
