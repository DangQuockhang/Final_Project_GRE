import React,{useCallback,useEffect,useState} from 'react';
import {useLocation,useSearchParams} from 'react-router-dom';
import {Search,ArrowRight,ChevronLeft,ChevronRight,PackageSearch,AlertCircle} from 'lucide-react';
import {money} from '@kd/catalog';
const titles={orders:'Orders',inventory:'Stock watchlist','best-sellers':'Best-selling products','catalog-health':'Catalog health'};
const statusNames={PENDING:'Pending',CONFIRMED:'Confirmed',SHIPPED:'Shipped',DELIVERED:'Delivered',CANCELLED:'Cancelled',active:'Active',draft:'Draft',archived:'Archived',UNPAID:'Unpaid',AWAITING_TRANSFER:'Awaiting transfer',PAID:'Paid',REFUND_PENDING:'Refund pending'};
const date=value=>new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'medium',timeStyle:'short'});
const number=value=>new Intl.NumberFormat('en').format(value||0);
function Badge({value}){return <span className={'kd-ops-badge '+String(value).toLowerCase().replaceAll(' ','-')}>{statusNames[value]||value}</span>;}
function Filter({label,value,options,onChange}){
 return <label>{label}<select value={value} onChange={event=>onChange(event.target.value)}>{options.map(([key,text])=><option value={key} key={key}>{text}</option>)}</select></label>;
}
const options=values=>values.map(value=>[value,statusNames[value]||value]);
export default function AdminReportPage({kind,api,revision,onNavigate}){
 const [params,setParams]=useSearchParams(),location=useLocation(),rawSearch=params.get('search')||'';
 const [search,setSearch]=useState(rawSearch),[retry,setRetry]=useState(0);
 const [result,setResult]=useState({key:'',data:null,loading:true,error:''});
 const query=params.toString(),key=kind+'?'+query+'#'+revision+'-'+retry;
 const update=useCallback(values=>setParams(previous=>{
  const next=new URLSearchParams(previous);
  for(const [name,value] of Object.entries(values)){if(value===''||value==null)next.delete(name);else next.set(name,String(value));}
  if(!Object.hasOwn(values,'page'))next.delete('page');
  return next;
 },{replace:true,state:location.state}),[setParams,location.state]);
 useEffect(()=>setSearch(rawSearch),[rawSearch]);
 useEffect(()=>{
  if(search===rawSearch)return;
  const timer=setTimeout(()=>update({search:search.trim()}),350);
  return()=>clearTimeout(timer);
 },[search,rawSearch,update]);
 useEffect(()=>{
  let live=true;setResult({key,data:null,loading:true,error:''});
  api('/admin/reports/'+kind+(query?'?'+query:'')).then(data=>{if(live)setResult({key,data,loading:false,error:''});})
   .catch(error=>{if(live)setResult({key,data:null,loading:false,error:error.message||'Không thể tải dữ liệu. Vui lòng thử lại.'});});
  return()=>{live=false;};
 },[kind,query,key,api]);
 const loading=result.loading||result.key!==key,data=result.key===key?result.data:null,error=result.key===key?result.error:'';
 const filter=params.get('filter')||(kind==='inventory'?'attention':'issues');
 const select=(name,value)=>update({[name]:value});
 const stats=data?(kind==='orders'?[['Matching orders',data.summary.total],['Pending confirmation',data.summary.pending],['Awaiting transfer',data.summary.awaiting_transfer]]:
  kind==='inventory'?[['Matching SKUs',data.summary.total],['Units in stock',data.summary.units],['Sold-out SKUs',data.summary.sold_out]]:
  kind==='best-sellers'?[['Products sold',data.summary.total],['Units ordered',data.summary.units],['Order value',money(data.summary.value)]]:
  [['Matching products',data.summary.total],['Drafts',data.summary.drafts],['Missing cover / SKUs (active)',data.summary.missing_cover+' / '+data.summary.missing_skus]]):[];
 const edit=item=>onNavigate('products',{id:item.product_id});
 const productCell=item=><><button className="kd-ops-link" type="button" onClick={()=>edit(item)}>{item.name}</button><small>{item.brand_name}</small></>;
 const reset=()=>{setSearch('');setParams({}, {replace:true,state:location.state});};
 return <section className="kd-report" aria-label={titles[kind]+' details'}>
  <div className="kd-report-toolbar">
   <label className="kd-report-search"><Search size={18} aria-hidden="true"/><input type="search" maxLength={120} aria-label={'Search '+titles[kind]} placeholder={kind==='orders'?'Order code, customer, email or phone…':kind==='inventory'?'Product, brand, SKU, color or size…':'Product or brand…'} value={search} onChange={event=>setSearch(event.target.value)}/></label>
   {kind==='orders'&&<>
    <Filter label="Order status" value={params.get('status')||'all'} options={[['all','All statuses'],...options(['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'])]} onChange={value=>select('status',value)}/>
    <Filter label="Payment status" value={params.get('payment_status')||'all'} options={[['all','All payments'],...options(['UNPAID','AWAITING_TRANSFER','PAID','REFUND_PENDING'])]} onChange={value=>select('payment_status',value)}/>
    <Filter label="Method" value={params.get('payment_method')||'all'} options={[['all','All methods'],['COD','Cash on delivery'],['BANK_TRANSFER','Bank transfer']]} onChange={value=>select('payment_method',value)}/>
   </>}
   {kind==='inventory'&&<Filter label="Stock level" value={filter} options={[['attention','Needs attention (0–3)'],['sold_out','Sold out'],['low_stock','Low stock (1–3)'],['in_stock','In stock (4+)'],['all','All active SKUs']]} onChange={value=>select('filter',value)}/>}
   {kind==='catalog-health'&&<Filter label="Catalog filter" value={filter} options={[['issues','Needs attention'],['missing_cover','Active without cover'],['missing_skus','Active without SKUs'],['draft','Drafts'],['active','Active'],['archived','Archived'],['all','All products']]} onChange={value=>select('filter',value)}/>}
   {['orders','best-sellers'].includes(kind)&&<Filter label="Period" value={params.get('days')||(kind==='orders'?'all':'30')} options={[...(kind==='orders'?[['all','All dates']]:[]),...['7','30','90'].map(value=>[value,'Last '+value+' days'])]} onChange={value=>select('days',value)}/>}
   {kind!=='catalog-health'&&<Filter label="Sort by" value={params.get('sort')||(kind==='orders'?'newest':kind==='inventory'?'stock_asc':'units')} options={kind==='orders'?[['newest','Newest first'],['oldest','Oldest first']]:kind==='inventory'?[['stock_asc','Lowest stock'],['stock_desc','Highest stock']]:[['units','Units ordered'],['value','Order value']]} onChange={value=>select('sort',value)}/>}
   <button type="button" className="kd-ops-button" onClick={reset}>Reset filters</button>
  </div>
  <p className="kd-report-context">{kind==='orders'?'Search all orders and open a record to review items, payment and delivery. Dates use Vietnam time.':
   kind==='inventory'?'Active products only. Sold out: 0 units. Low stock: 1–3 units. Each row is one SKU.':
   kind==='best-sellers'?'Cancelled orders are excluded. Order value includes unpaid orders; Paid value is shown separately. Dates use Vietnam time.':
   'Review catalog readiness, then open a product to complete its information. Drafts remain hidden from the storefront.'}</p>
  {loading?<div className="kd-ops-skeleton kd-report-skeleton" role="status" aria-label="Loading report"><div/><div/><div/><p>Loading records…</p></div>:
   error?<div className="kd-ops-empty" role="alert"><AlertCircle/><h2>Không thể tải dữ liệu</h2><p>{error}</p><button className="kd-ops-button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:
   data&&<>
    <div className="kd-report-stats">{stats.map(([label,value])=><article key={label}><span>{label}</span><strong>{typeof value==='number'?number(value):value}</strong></article>)}</div>
    <div className="kd-report-results"><header><div><h2>{titles[kind]}</h2><p role="status">{number(data.pagination.total)} matching records</p></div>{kind==='catalog-health'&&<button className="kd-ops-button" onClick={()=>onNavigate('products',{create:true})}>Add product <ArrowRight size={16}/></button>}</header>
     {!data.items.length?<div className="kd-ops-empty"><PackageSearch size={28}/><h2>No matching records</h2><p>Try another search or reset the filters to see more results.</p><button className="kd-ops-button" onClick={reset}>Reset filters</button></div>:
      <div className="kd-ops-scroll" tabIndex={0} role="region" aria-label={titles[kind]+' table; scroll horizontally on small screens'}>
       {kind==='orders'?<table className="kd-report-table"><thead><tr><th>Order / date</th><th>Customer</th><th>Items / total</th><th>Order status</th><th>Payment</th><th>Details</th></tr></thead><tbody>{data.items.map(item=><tr key={item.id}>
        <td><button className="kd-ops-link" onClick={()=>onNavigate('orders',{id:item.id})}>{item.order_code||'#'+item.id}</button><small>{date(item.created_at)}</small></td>
        <td><strong>{item.recipient}</strong><small>{item.email}</small><small>{item.phone}</small></td><td><strong>{money(item.total)}</strong><small>{item.item_count} items</small></td><td><Badge value={item.status}/></td><td><Badge value={item.payment_status}/><small>{item.payment_method==='COD'?'Cash on delivery':'Bank transfer'}</small></td><td><button className="kd-ops-button" onClick={()=>onNavigate('orders',{id:item.id})}>View order <ArrowRight size={15}/></button></td>
       </tr>)}</tbody></table>:
       kind==='inventory'?<table className="kd-report-table"><thead><tr><th>Product / brand</th><th>SKU</th><th>Color / size</th><th>Stock</th><th>Action</th></tr></thead><tbody>{data.items.map(item=><tr key={item.id}><td>{productCell(item)}</td><td className="kd-report-code">{item.sku}</td><td>{item.color}<small>Size: {item.size}</small></td><td><strong>{number(item.stock)}</strong><small><Badge value={item.stock===0?'Sold out':item.stock<=3?'Low stock':'In stock'}/></small></td><td><button className="kd-ops-button" onClick={()=>edit(item)}>Edit stock <ArrowRight size={15}/></button></td></tr>)}</tbody></table>:
       kind==='best-sellers'?<table className="kd-report-table"><thead><tr><th>Rank</th><th>Product / brand</th><th>Units</th><th>Orders</th><th>Order value</th><th>Paid value</th><th>Action</th></tr></thead><tbody>{data.items.map((item,index)=><tr key={item.product_id}><td>{(data.pagination.page-1)*data.pagination.page_size+index+1}</td><td>{productCell(item)}<small><Badge value={item.status}/></small></td><td><strong>{number(item.units)}</strong></td><td>{number(item.order_count)}</td><td>{money(item.value)}</td><td>{money(item.paid_value)}</td><td><button className="kd-ops-button" onClick={()=>edit(item)}>Open product</button></td></tr>)}</tbody></table>:
       <table className="kd-report-table"><thead><tr><th>Product / brand</th><th>Status</th><th>Cover</th><th>SKUs / stock</th><th>Price</th><th>Action</th></tr></thead><tbody>{data.items.map(item=><tr key={item.product_id}><td>{productCell(item)}<small>{item.category} · {item.product_type||'No product type'}</small></td><td><Badge value={item.status}/></td><td><span className={item.image_url?'kd-report-ok':'kd-report-issue'}>{item.image_url?'Ready':'Missing cover'}</span></td><td><span className={item.variant_count?'':'kd-report-issue'}>{item.variant_count} SKUs</span><small>{number(item.stock)} units</small></td><td>{money(item.price)}</td><td><button className="kd-ops-button" onClick={()=>edit(item)}>Open product</button></td></tr>)}</tbody></table>}
      </div>}
     <footer className="kd-report-pagination"><span>{data.pagination.total?((data.pagination.page-1)*data.pagination.page_size+1)+'–'+Math.min(data.pagination.page*data.pagination.page_size,data.pagination.total)+' of '+number(data.pagination.total):'0 records'}</span><div><button className="kd-ops-button" disabled={data.pagination.page<=1} onClick={()=>update({page:data.pagination.page-1})}><ChevronLeft size={16}/> Previous</button><span>Page {data.pagination.page} of {Math.max(1,data.pagination.pages)}</span><button className="kd-ops-button" disabled={data.pagination.page>=data.pagination.pages} onClick={()=>update({page:data.pagination.page+1})}>Next <ChevronRight size={16}/></button></div></footer>
    </div>
   </>}
 </section>;
}
