import React,{useId,useState} from 'react';
import {ArrowUpRight,ArrowDownRight,Download,Wallet,ShoppingBag,Users,Receipt,ChevronRight,Package,Plus,AlertCircle,CheckCircle2} from 'lucide-react';
import {money} from '@kd/catalog';
const fmt=n=>new Intl.NumberFormat('en').format(n||0);
const date=value=>new Date(value).toLocaleDateString('en-GB',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'short'});
const statusName={PENDING:'Pending',CONFIRMED:'Confirmed',SHIPPED:'Shipped',DELIVERED:'Delivered',CANCELLED:'Cancelled'};
function Change({current,previous}){
 if(!previous)return <span className="kd-ops-change neutral">{current?'No prior baseline':'No change'}</span>;
 const delta=(current-previous)/previous*100,Icon=delta<0?ArrowDownRight:ArrowUpRight;
 return <span className={'kd-ops-change '+(delta<0?'down':'up')}><Icon size={13}/>{Math.abs(delta).toFixed(1)}% <span>vs prior period</span></span>;
}
function Trend({rows}){
 const [active,setActive]=useState(null),id=useId().replaceAll(':','');
 const max=Math.max(...rows.map(x=>x.paid_value),1),x=i=>42+i*610/Math.max(rows.length-1,1),y=v=>190-v/max*150;
 const points=rows.map((r,i)=>x(i)+','+y(r.paid_value)).join(' ');
 const selected=rows[active??rows.length-1];
 return <><div className="kd-ops-chart-summary"><strong>{money(selected?.paid_value||0)}</strong><span>{selected?.day} · {selected?.orders||0} orders</span></div>
  <svg className="kd-ops-trend" viewBox="0 0 680 230" role="img" aria-label="Paid order value by order creation date. Daily values are available in the table below.">
   <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#43a887" stopOpacity=".24"/><stop offset="100%" stopColor="#43a887" stopOpacity="0"/></linearGradient></defs>
   {[0,.5,1].map(t=><g key={t}><line x1="42" y1={y(t*max)} x2="652" y2={y(t*max)} stroke="#e9eeeb" strokeDasharray="4 5"/><text x="0" y={y(t*max)+4} fill="#89968e" fontSize="10">{new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(t*max)}</text></g>)}
   <polygon points={'42,190 '+points+' 652,190'} fill={'url(#'+id+')'}/>
   <polyline points={points} fill="none" stroke="#328e71" strokeWidth="3" strokeLinejoin="round"/>
   {rows.map((r,i)=><rect key={r.day} x={x(i)-610/rows.length/2} y="25" width={Math.max(610/rows.length,6)} height="175" fill="transparent" onMouseEnter={()=>setActive(i)}><title>{r.day+': '+money(r.paid_value)+' · '+r.orders+' orders'}</title></rect>)}
   {active!=null&&<circle cx={x(active)} cy={y(rows[active].paid_value)} r="5" fill="#fff" stroke="#328e71" strokeWidth="3"/>}
   {[0,Math.floor((rows.length-1)/2),rows.length-1].map(i=><text key={i} x={x(i)} y="222" textAnchor="middle" fill="#89968e" fontSize="11">{rows[i]?.day.slice(5)}</text>)}
  </svg>
  <details className="kd-ops-daily"><summary>View daily figures</summary><div className="kd-ops-scroll"><table><thead><tr><th>Date (Vietnam)</th><th>Orders</th><th>Paid order value</th></tr></thead><tbody>{rows.map(r=><tr key={r.day}><td>{r.day}</td><td>{r.orders}</td><td>{money(r.paid_value)}</td></tr>)}</tbody></table></div></details>
 </>;
}
function exportReport(data){
 const rows=[['KD store performance','VND','Asia/Ho_Chi_Minh'],['Period start',data.range.start],['Period end',data.range.end],['Metric','Current','Previous'],['Paid order value',data.current.paid_value,data.previous.paid_value],['Orders',data.current.orders,data.previous.orders],['Ordering customers',data.current.customers,data.previous.customers],[],['Date','Orders','Paid order value'],...data.trend.map(r=>[r.day,r.orders,r.paid_value])];
 const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download='kd-store-'+data.days+'-days.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function DashboardOverview({data,loading,error,days,onDays,onRetry,onNavigate,busy}){
 const controls=<div className="kd-ops-period"><div><label htmlFor="kd-dashboard-period">Reporting period</label><select id="kd-dashboard-period" value={days} onChange={e=>onDays(Number(e.target.value))}>{[7,30,90].map(n=><option key={n} value={n}>Last {n} days</option>)}</select><span>Vietnam time · Includes today</span></div><button type="button" className="kd-ops-button" disabled={loading||!!error||!data} onClick={()=>exportReport(data)}><Download size={16}/> Export report</button></div>;
 if(error)return <>{controls}<div className="kd-ops-empty" role="alert"><AlertCircle/><h2>Analytics could not load</h2><p>{error}</p><button className="kd-ops-button" onClick={onRetry}>Try again</button></div></>;
 if(loading||!data)return <>{controls}<div className="kd-ops-skeleton" role="status" aria-label="Loading dashboard">{[1,2,3,4].map(n=><div key={n}/>)}<p>Preparing your store overview…</p></div></>;
 const {current:c,previous:p,operations:o}=data;
 const avg=v=>v.valid_orders?v.order_value/v.valid_orders:0;
 const cards=[['Paid order value',money(c.paid_value),c.paid_value,p.paid_value,Wallet],['Orders placed',fmt(c.orders),c.orders,p.orders,ShoppingBag],['Ordering customers',fmt(c.customers),c.customers,p.customers,Users],['Average order value',money(avg(c)),avg(c),avg(p),Receipt]];
 const total=data.pipeline.reduce((sum,r)=>sum+r.count,0);
 const actions=[['Confirm new orders',o.pending,{status:'PENDING'},'orders'],['Prepare shipments',o.to_ship,{status:'CONFIRMED'},'orders'],['Verify bank transfers',o.awaiting_transfer,{payment_status:'AWAITING_TRANSFER'},'orders'],['Review pending refunds',o.refunds,{payment_status:'REFUND_PENDING'},'orders']];
 return <>{controls}
  <div className="kd-ops-kpis">{cards.map(([title,value,cur,prev,Icon])=><article key={title}><div><span>{title}</span><i><Icon size={19}/></i></div><strong>{value}</strong><Change current={cur} previous={prev}/></article>)}</div>
  <div className="kd-ops-analytics-grid">
   <section className="kd-ops-card"><header><div><h2>Sales performance</h2><p>Paid order value · {date(data.range.start)} – {date(data.range.end)}</p></div><span className="kd-ops-live"><i/> Live data</span></header><Trend rows={data.trend}/></section>
   <section className="kd-ops-card"><header><div><h2>Order breakdown</h2><p>{fmt(total)} orders in this period</p></div><ShoppingBag size={18}/></header>
    <div className="kd-ops-pipeline">{Object.entries(statusName).map(([status,label])=>{const count=data.pipeline.find(r=>r.status===status)?.count||0;return <div key={status}><div><span><i className={'kd-ops-dot '+status.toLowerCase()}/>{label}</span><strong>{count}</strong></div><div className="kd-ops-track"><span className={status.toLowerCase()} style={{width:(total?count/total*100:0)+'%'}}/></div></div>;})}</div>
   </section>
  </div>
  <section className="kd-ops-actions"><div><span className="kd-ops-eyebrow">TODAY'S PRIORITIES</span><h2>Needs your attention</h2><p>Current backlog across all dates</p></div><div>{actions.map(([label,count,filter,tab])=><button type="button" disabled={busy||!count} key={label} onClick={()=>onNavigate(tab,filter)}><span>{label}</span><strong>{count}<ChevronRight size={17}/></strong></button>)}</div></section>
  <div className="kd-ops-table-grid">
   <section className="kd-ops-card"><header><div><h2>Latest orders</h2><p>Most recent activity across all dates</p></div><button type="button" disabled={busy} onClick={()=>onNavigate('orders')}>View orders <ArrowUpRight size={14}/></button></header>
    {data.recent_orders.length?<div className="kd-ops-scroll"><table><thead><tr><th>Order / customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{data.recent_orders.map(order=><tr key={order.id}><td><button disabled={busy} type="button" className="kd-ops-link" onClick={()=>onNavigate('orders',{id:order.id})}>{order.order_code||'#'+order.id}</button><small>{order.recipient}</small></td><td>{date(order.created_at)}</td><td><span className={'kd-ops-badge '+order.status.toLowerCase()}>{statusName[order.status]}</span></td><td>{money(order.total)}</td></tr>)}</tbody></table></div>:<div className="kd-ops-empty"><ShoppingBag/><p>Your first order will appear here.</p></div>}
   </section>
   <section className="kd-ops-card"><header><div><h2>Best-selling products</h2><p>Units ordered · Cancelled orders excluded</p></div><Package size={18}/></header>
    {data.top_products.length?<ol className="kd-ops-ranking">{data.top_products.map((item,i)=><li key={item.product_id+'-'+item.name}><span>{String(i+1).padStart(2,'0')}</span><button disabled={busy} onClick={()=>onNavigate('products',{id:item.product_id})}>{item.name}<small>{money(item.value)}</small></button><strong>{item.units}<small>units</small></strong></li>)}</ol>:<div className="kd-ops-empty"><Package/><p>No sales in this period yet.</p></div>}
   </section>
  </div>
  <div className="kd-ops-table-grid">
   <section className="kd-ops-card"><header><div><h2>Stock watchlist</h2><p>{o.out_of_stock} sold-out SKUs · {o.low_stock} low-stock SKUs · Active products</p></div><button disabled={busy} onClick={()=>onNavigate('products')}>Manage stock <ArrowUpRight size={14}/></button></header>
    {data.low_stock.length?<div className="kd-ops-scroll"><table><thead><tr><th>Product</th><th>Variant / SKU</th><th>Stock</th><th>Action</th></tr></thead><tbody>{data.low_stock.map(item=><tr key={item.sku}><td>{item.name}</td><td>{item.color} / {item.size}<small>{item.sku}</small></td><td><span className={'kd-ops-badge '+(item.stock===0?'cancelled':'pending')}>{item.stock===0?'Sold out':item.stock+' left'}</span></td><td><button disabled={busy} className="kd-ops-link" onClick={()=>onNavigate('products',{id:item.product_id})}>Edit stock</button></td></tr>)}</tbody></table></div>:<div className="kd-ops-empty"><CheckCircle2/><p>No active SKU is running low.</p></div>}
   </section>
   <section className="kd-ops-card kd-ops-catalog-health"><header><div><h2>Catalog health</h2><p>Current catalog, all products</p></div><CheckCircle2 size={18}/></header><dl><div><dt>Active products</dt><dd>{o.active_products}</dd></div><div><dt>Drafts</dt><dd>{o.draft_products}</dd></div><div><dt>Active without cover</dt><dd>{o.missing_cover}</dd></div><div><dt>Active without SKUs</dt><dd>{o.missing_skus}</dd></div></dl><button className="kd-ops-primary" disabled={busy} onClick={()=>onNavigate('products',{create:true})}><Plus size={17}/> Add product</button></section>
  </div>
  <footer className="kd-ops-footnote"><p>Paid order value includes orders currently marked PAID, excluding cancelled orders. Charts group by order creation date, not payment date. Average value and customers exclude cancellations. Comparisons use the same elapsed time in the preceding period.</p><span>Updated {new Date(data.generated_at).toLocaleTimeString('en-GB',{timeZone:'Asia/Ho_Chi_Minh'})} · Vietnam time</span></footer>
 </>;
}
