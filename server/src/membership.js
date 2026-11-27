const codes=['bronze','silver','gold','diamond','platinum'];
export function membershipSummary(rawTiers,spend){
 const tiers=rawTiers.map(t=>({...t,min_spend:Number(t.min_spend)})).sort((a,b)=>a.rank-b.rank);
 if(!Number.isSafeInteger(spend)||spend<0||tiers.length!==5||tiers.some((t,i)=>
  t.code!==codes[i]||t.rank!==i+1||!Number.isSafeInteger(t.min_spend)||t.min_spend<0||
  (i===0?t.min_spend!==0:t.min_spend<=tiers[i-1].min_spend)||
  typeof t.name!=='string'||!t.name.trim()||!Array.isArray(t.benefits)||
  t.benefits.some(b=>typeof b!=='string'||b.length>300))){
  const error=new Error('Cấu hình hạng thành viên chưa hợp lệ. Cửa hàng đang kiểm tra lại.');error.status=503;error.code='MEMBERSHIP_UNAVAILABLE';throw error;
 }
 const index=tiers.findLastIndex(t=>spend>=t.min_spend),current=tiers[index],next=tiers[index+1]||null;
 return {lifetime_spend:spend,current,next,tiers,
  remaining:next?next.min_spend-spend:0,
  progress:next?Math.min(100,Math.max(0,(spend-current.min_spend)/(next.min_spend-current.min_spend)*100)):100};
}
export function registerMembershipRoutes(route,{pool,authorize}){
 route.get('/account/membership',authorize,async(req,res,next)=>{
  let client;
  try{
   client=await pool.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const tiers=(await client.query('SELECT code,name,rank,min_spend,benefits FROM membership_tiers ORDER BY rank')).rows;
   // Derive from authoritative orders on each read: no stale cached tier, no double-credit,
   // and returns immediately reduce lifetime spend without rewriting old orders.
   const {spend,count}=(await client.query(`SELECT COALESCE(sum(total),0)::text AS spend,count(*)::int AS count
    FROM orders WHERE user_id=$1 AND status='DELIVERED' AND payment_status='PAID'`,[req.user.id])).rows[0];
   const {name,created_at}=(await client.query('SELECT name,created_at FROM users WHERE id=$1',[req.user.id])).rows[0];
   const summary=membershipSummary(tiers,Number(spend));await client.query('COMMIT');
   res.set('Cache-Control','no-store').json({...summary,completed_orders:count,name,
    member_number:'KD-'+String(req.user.id).padStart(8,'0'),member_since:created_at});
  }catch(error){if(client)await client.query('ROLLBACK');next(error);}finally{client?.release();}
 });
}
