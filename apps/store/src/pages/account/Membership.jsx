import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,RefreshCw} from 'lucide-react';
import {money} from '@kd/catalog';
import {Message} from '../../components/account/AccountFields.jsx';
import '../../styles/membership.css';
export default function Membership({token,request}){
 const [result,setResult]=useState({loading:true,data:null,error:''}),[revision,setRevision]=useState(0);
 useEffect(()=>{
  let live=true;const controller=new AbortController();setResult({loading:true,data:null,error:''});
  request('/account/membership',{token,signal:controller.signal})
   .then(data=>{if(live)setResult({loading:false,data,error:''});})
   .catch(error=>{if(live&&error.name!=='AbortError')setResult({loading:false,data:null,error:error.message||'Unable to load your membership.'});});
  return()=>{live=false;controller.abort();};
 },[token,request,revision]);
 if(result.loading)return <div className="kd-account-skeleton" role="status" aria-label="Loading membership"><div/><div/><p>Loading your membership…</p></div>;
 if(result.error)return <div className="kd-account-card"><Message error>{result.error}</Message><button className="kd-account-primary" onClick={()=>setRevision(n=>n+1)}>Try again</button></div>;
 const names={bronze:'Bronze',silver:'Silver',gold:'Gold',diamond:'Diamond',platinum:'Platinum'};
 const label=t=>({...t,name:names[t.code]||t.name});
 const data=result.data,current=label(data.current),next=data.next?label(data.next):null,tiers=data.tiers.map(label);
 const year=new Date(data.member_since).toLocaleDateString('en-GB',{year:'numeric',timeZone:'Asia/Ho_Chi_Minh'});
 return <section className="kd-membership" aria-labelledby="membership-title">
  <header className="kd-membership-heading"><div><span className="kd-account-eyebrow">KD / MEMBERSHIP</span><h2 id="membership-title">Made for your personal style</h2><p>Every completed order is part of your story.</p></div>
   <button className="kd-account-secondary" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/>Refresh</button></header>
  <div className="kd-membership-overview">
   <article className={'kd-member-card kd-member-card-'+current.code} aria-label={'Membership card: '+current.name}>
    <svg className="kd-member-pattern" viewBox="0 0 460 290" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M210 -50 510 250M180 -50 510 280M150 -50 510 310M120 -50 510 340M90 -50 510 370M60 -50 510 400"/><path d="M260 -40 100 320M290 -40 130 320M320 -40 160 320M350 -40 190 320"/></svg>
    <div className="kd-member-card-top"><span>KD DESIGN</span><span>MEMBERSHIP</span></div>
    <h3>{current.name}</h3><div className="kd-member-card-person"><strong>{data.name}</strong><span>{data.member_number}</span><small>Member since {year}</small></div>
   </article>
   <div className="kd-member-spend"><span>LIFETIME SPEND</span><strong>{money(data.lifetime_spend)}</strong><p>{data.completed_orders} delivered and paid orders.</p><small>Lifetime total. Cancelled and returned orders are excluded.</small><Link to="/account?tab=orders">View orders <ArrowUpRight size={17}/></Link></div>
  </div>
  <section className="kd-member-progress" aria-labelledby="membership-progress-title">
   <h3 id="membership-progress-title">{next?<>Spend <b>{money(data.remaining)}</b> more to reach {next.name}</>:'You have reached Platinum — our highest tier'}</h3>
   <div className="kd-member-progress-track" role="progressbar" aria-label={next?'Progress towards '+next.name:'Highest tier reached'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(data.progress)}><span style={{width:data.progress+'%'}}/></div>
   <p>{next?'Progress is measured from your current tier to the next.':'Thank you for being part of KD.'}</p>
   <ol className="kd-member-milestones">{tiers.map(tier=><li key={tier.code} aria-current={tier.code===current.code?'step':undefined} className={tier.rank<=current.rank?'kd-member-reached':''}><span aria-hidden="true"/><strong>{tier.name}</strong><small>{money(tier.min_spend)}</small></li>)}</ol>
  </section>
  <section className="kd-member-benefits"><h3>Benefits: {current.name}</h3>
   {current.benefits.length?<ul>{current.benefits.map((benefit,i)=><li key={i}>{benefit}</li>)}</ul>:<p>No exclusive benefits have been announced for this tier yet. Your tier and lifetime spend continue to update.</p>}
  </section>
  {data.completed_orders===0&&<div className="kd-member-first-order"><p>Start with a piece you love. Your spending counts once your order is delivered and payment is confirmed.</p><Link className="kd-account-primary" to="/shop">Explore products <ArrowUpRight size={17}/></Link></div>}
 </section>;
}
