import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
export async function startMailCapture(){
 const mail={messages:[],fail:false};
 mail.server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  if(mail.fail){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}
  mail.messages.push(JSON.parse(raw));res.writeHead(200,{'Content-Type':'application/json'});res.end('{"id":"test-delivery"}');
 });
 await new Promise(resolve=>mail.server.listen(0,'127.0.0.1',resolve));
 mail.url='http://127.0.0.1:'+mail.server.address().port+'/emails';
 return mail;
}
export async function accountChecks(base,mail){
 const db=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const call=async(path,{body,token,method='POST'}={})=>{
  const multipart=body instanceof FormData;
  const response=await fetch(base+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!multipart&&body?{'Content-Type':'application/json'}:{})},body:body?(multipart?body:JSON.stringify(body)):undefined});
  const data=await response.json();
  assert.equal(JSON.stringify(data).includes('password_hash'),false,'Never return password hashes');
  return {status:response.status,data};
 };
 const email='account-'+randomUUID()+'@example.test',password='OriginalPassword2026';
 try{
  await db.query('DELETE FROM auth_rate_limits');
  const registered=await call('/auth/register',{body:{name:'Customer One',email:email.toUpperCase(),password,role:'admin'}});
  assert.equal(registered.status,201);assert.equal(registered.data.user.email,email);assert.equal(registered.data.user.role,'user');
  const user=registered.data.user,token=registered.data.token;
  assert.equal(user.phone,null);
  assert.equal((await call('/auth/register',{body:{name:'Duplicate',email,password}})).status,409);
  const duplicateRace=await Promise.all([
   call('/auth/register',{body:{name:'Concurrent Customer',email:'race-'+email,password}}),
   call('/auth/register',{body:{name:'Concurrent Customer',email:('race-'+email).toUpperCase(),password}})
  ]);
  assert.deepEqual(duplicateRace.map(r=>r.status).sort(),[201,409],'Unique email holds under concurrent registration');
  assert.equal((await call('/auth/register',{body:{name:'Long password',email:'long-'+email,password:'ệ'.repeat(25)}})).status,400);
  assert.equal((await call('/auth/me',{method:'GET'})).status,401);
  assert.equal((await call('/admin/products',{method:'GET',token})).status,403);
  const oldFormat=jwt.sign({id:user.id,role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
  assert.equal((await call('/auth/me',{method:'GET',token:oldFormat})).status,401);
  const staleRole=jwt.sign({id:user.id,version:0,role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
  assert.equal((await call('/admin/products',{method:'GET',token:staleRole})).status,403,'Database role overrides stale token claims');
  assert.equal((await call('/auth/me',{method:'PATCH',token,body:{name:'Valid Name',phone:'abc'}})).status,400);
  const malformed=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"password":"do-not-echo'});
  assert.equal(malformed.status,400);assert.equal((await malformed.text()).includes('do-not-echo'),false,'Malformed JSON never echoes credential fragments');
  assert.equal((await call('/auth/me',{method:'PATCH',token,body:{name:'Customer One',email:'hijack@example.test'}})).status,400);
  assert.equal((await call('/auth/me',{method:'PATCH',token,body:{name:'Customer One',user_id:1}})).status,400);
  let updated=await call('/auth/me',{method:'PATCH',token,body:{name:'Khách mới',phone:'+84 912 345 678'}});
  assert.equal(updated.status,200);assert.equal(updated.data.user.phone,'+84912345678');
  assert.equal(updated.data.user.email,email);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz0AAAAASUVORK5CYII=','base64');
  const avatarBody=(bytes,type='image/png')=>{const f=new FormData();f.append('name','Khách mới');f.append('phone','0912345678');f.append('avatar',new Blob([bytes],{type}),'avatar.png');return f;};
  updated=await call('/auth/me',{method:'PATCH',token,body:avatarBody(png)});
  assert.equal(updated.status,200);assert.match(updated.data.user.avatar_url,/^\/media\/avatars\//);
  const avatar=updated.data.user.avatar_url;
  const media=await fetch(base+avatar);assert.equal(media.status,200);assert.equal(media.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await call('/auth/me',{method:'PATCH',token,body:avatarBody(Buffer.from('<svg onload="alert(1)"></svg>'))})).status,400);
  assert.equal((await call('/auth/me',{method:'PATCH',token,body:avatarBody(Buffer.alloc(2*1024*1024+1))})).status,413);
  assert.equal((await call('/auth/me',{method:'GET',token})).data.avatar_url,avatar,'Rejected uploads keep the current avatar');
  updated=await call('/auth/me',{method:'PATCH',token,body:{name:'Khách mới',phone:'',remove_avatar:true}});
  assert.equal(updated.data.user.avatar_url,null);assert.equal((await fetch(base+avatar)).status,404);
  const other=await call('/auth/register',{body:{name:'Customer Two',email:'other-'+email,password}});
  assert.equal((await call('/auth/me',{method:'GET',token:other.data.token})).data.name,'Customer Two');
  const change=body=>call('/auth/change-password',{token,body});
  assert.equal((await change({current_password:'Wrong',new_password:'ChangedPassword2026',confirm_password:'ChangedPassword2026'})).status,400);
  assert.equal((await change({current_password:password,new_password:'ChangedPassword2026',confirm_password:'Mismatch'})).status,400);
  assert.equal((await change({current_password:password,new_password:'ChangedPassword2026',confirm_password:'ChangedPassword2026'})).status,200);
  assert.equal((await call('/auth/me',{method:'GET',token})).status,401);
  assert.equal((await call('/auth/login',{body:{email,password}})).status,401);
  let login=await call('/auth/login',{body:{email,password:'ChangedPassword2026'}});
  assert.equal(login.status,200);
  await db.query("UPDATE users SET status='blocked' WHERE id=$1",[user.id]);
  assert.equal((await call('/auth/me',{method:'GET',token:login.data.token})).status,403);
  assert.equal((await call('/auth/login',{body:{email,password:'ChangedPassword2026'}})).data.code,'ACCOUNT_BLOCKED');
  await db.query("UPDATE users SET status='active',token_version=token_version+1 WHERE id=$1",[user.id]);
  login=await call('/auth/login',{body:{email,password:'ChangedPassword2026'}});
  assert.equal(login.status,200);
  const before=mail.messages.length;
  const unknown=await call('/auth/forgot-password',{body:{email:'unknown-'+email}});
  assert.equal(unknown.status,202);assert.equal(mail.messages.length,before);
  const forgot=await call('/auth/forgot-password',{body:{email}});
  assert.deepEqual(forgot.data,unknown.data);assert.equal(forgot.status,202);
  const lastToken=()=>mail.messages.at(-1).text.match(/#token=([a-f0-9]{64})/)[1];
  let resetToken=lastToken();
  const stored=(await db.query('SELECT * FROM password_reset_tokens WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user.id])).rows[0];
  assert.equal(stored.token_hash,createHash('sha256').update(resetToken).digest('hex'));
  assert.notEqual(stored.token_hash,resetToken);
  const reset=token=>call('/auth/reset-password',{body:{token,new_password:'ResetPassword2026',confirm_password:'ResetPassword2026'}});
  const race=await Promise.all([reset(resetToken),reset(resetToken)]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,400],'Reset link is single-use even concurrently');
  assert.equal((await call('/auth/me',{method:'GET',token:login.data.token})).status,401);
  assert.equal((await call('/auth/login',{body:{email,password:'ResetPassword2026'}})).status,200);
  await call('/auth/forgot-password',{body:{email}});resetToken=lastToken();
  await db.query("UPDATE password_reset_tokens SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",[createHash('sha256').update(resetToken).digest('hex')]);
  assert.equal((await reset(resetToken)).status,400);
  mail.fail=true;
  assert.equal((await call('/auth/forgot-password',{body:{email}})).status,202);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM password_reset_tokens WHERE user_id=$1 AND used_at IS NULL AND expires_at>now()',[user.id])).rows[0].count,0);
  mail.fail=false;
  assert.equal((await call('/auth/forgot-password',{body:{email}})).status,429);
  await db.query('DELETE FROM auth_rate_limits');
  // A password change invalidates previously issued reset links.
  await call('/auth/forgot-password',{body:{email}});resetToken=lastToken();
  login=await call('/auth/login',{body:{email,password:'ResetPassword2026'}});
  assert.equal((await call('/auth/change-password',{token:login.data.token,body:{current_password:'ResetPassword2026',new_password:'FinalPassword2026',confirm_password:'FinalPassword2026'}})).status,200);
  assert.equal((await reset(resetToken)).status,400);
 }finally{mail.fail=false;await db.end();}
}
