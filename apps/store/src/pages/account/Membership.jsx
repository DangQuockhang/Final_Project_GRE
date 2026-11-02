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
   .catch(error=>{if(live&&error.name!=='AbortError')setResult({loading:false,data:null,error:error.message||'Chưa tải được thẻ thành viên.'});});
  return()=>{live=false;controller.abort();};
 },[token,request,revision]);
 if(result.loading)return <div className="kd-account-skeleton" role="status" aria-label="Đang tải thẻ thành viên"><div/><div/><p>Đang cập nhật hạng của bạn…</p></div>;
 if(result.error)return <div className="kd-account-card"><Message error>{result.error}</Message><button className="kd-account-primary" onClick={()=>setRevision(n=>n+1)}>Thử tải thẻ</button></div>;
 const data=result.data,{current,next,tiers}=data;
 const year=new Date(data.member_since).toLocaleDateString('vi-VN',{year:'numeric',timeZone:'Asia/Ho_Chi_Minh'});
 return <section className="kd-membership" aria-labelledby="membership-title">
  <header className="kd-membership-heading"><div><span className="kd-account-eyebrow">KD / THÀNH VIÊN</span><h2 id="membership-title">Đồng hành cùng gu riêng</h2><p>Mỗi đơn hoàn tất ghi dấu một lựa chọn của bạn.</p></div>
   <button className="kd-account-secondary" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/>Cập nhật</button></header>
  <div className="kd-membership-overview">
   <article className={'kd-member-card kd-member-card-'+current.code} aria-label={'Thẻ thành viên hạng '+current.name}>
    <svg className="kd-member-pattern" viewBox="0 0 460 290" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M210 -50 510 250M180 -50 510 280M150 -50 510 310M120 -50 510 340M90 -50 510 370M60 -50 510 400"/><path d="M260 -40 100 320M290 -40 130 320M320 -40 160 320M350 -40 190 320"/></svg>
    <div className="kd-member-card-top"><span>KD DESIGN</span><span>MEMBERSHIP</span></div>
    <h3>{current.name}</h3><div className="kd-member-card-person"><strong>{data.name}</strong><span>{data.member_number}</span><small>Thành viên từ {year}</small></div>
   </article>
   <div className="kd-member-spend"><span>CHI TIÊU TÍCH LŨY</span><strong>{money(data.lifetime_spend)}</strong><p>{data.completed_orders} đơn đã giao và xác nhận thanh toán.</p><small>Tích lũy trọn đời. Đơn hủy hoặc hoàn trả không được tính.</small><Link to="/account?tab=orders">Xem lịch sử đơn <ArrowUpRight size={17}/></Link></div>
  </div>
  <section className="kd-member-progress" aria-labelledby="membership-progress-title">
   <h3 id="membership-progress-title">{next?<>Còn <b>{money(data.remaining)}</b> để lên hạng {next.name}</>:'Bạn đang ở hạng Platinum — hạng cao nhất'}</h3>
   <div className="kd-member-progress-track" role="progressbar" aria-label={next?'Tiến độ lên hạng '+next.name:'Đã đạt hạng cao nhất'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(data.progress)}><span style={{width:data.progress+'%'}}/></div>
   <p>{next?'Tiến độ được tính từ mốc hạng hiện tại đến hạng tiếp theo.':'Cảm ơn bạn đã đồng hành cùng KD.'}</p>
   <ol className="kd-member-milestones">{tiers.map(tier=><li key={tier.code} aria-current={tier.code===current.code?'step':undefined} className={tier.rank<=current.rank?'kd-member-reached':''}><span aria-hidden="true"/><strong>{tier.name}</strong><small>{money(tier.min_spend)}</small></li>)}</ol>
  </section>
  <section className="kd-member-benefits"><h3>Quyền lợi hạng {current.name}</h3>
   {current.benefits.length?<ul>{current.benefits.map((benefit,i)=><li key={i}>{benefit}</li>)}</ul>:<p>Cửa hàng chưa công bố ưu đãi riêng cho hạng này. Hạng và chi tiêu của bạn vẫn được cập nhật; ưu đãi sẽ hiển thị tại đây khi được áp dụng.</p>}
  </section>
  {data.completed_orders===0&&<div className="kd-member-first-order"><p>Bắt đầu bằng món đồ bạn yêu thích. Chi tiêu sẽ được cộng khi đơn đã giao và cửa hàng xác nhận nhận đủ tiền.</p><Link className="kd-account-primary" to="/shop">Khám phá sản phẩm <ArrowUpRight size={17}/></Link></div>}
 </section>;
}
