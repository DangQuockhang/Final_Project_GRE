import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {publicUser,normalizeEmail,validEmail,passwordError,profileValues} from './accountValidation.js';
import {avatarUpload,saveAvatar,removeAvatar} from './accountMedia.js';
import {resetMailConfig,sendResetEmail} from './accountEmail.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const error=(message,status=400,code='VALIDATION_ERROR')=>Object.assign(new Error(message),{status,code});
const genericReset='Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.';
export function createAccountService({pool,secret}){
 const query=(sql,values)=>pool.query(sql,values);
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const dummyHash=bcrypt.hash(randomBytes(32).toString('hex'),12);
 const issueToken=user=>jwt.sign({id:user.id,version:user.token_version},secret,{algorithm:'HS256',expiresIn:'8h'});
 const authorize=wrap(async(req,res,next)=>{
  let claims;
  try{claims=jwt.verify((req.headers.authorization||'').replace(/^Bearer\s+/i,''),secret,{algorithms:['HS256']});}
  catch{throw error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',401,'SESSION_EXPIRED');}
  if(!Number.isSafeInteger(claims.id)||!Number.isSafeInteger(claims.version))throw error('Vui lòng đăng nhập lại để tiếp tục.',401,'SESSION_EXPIRED');
  const user=(await query('SELECT id,name,email,phone,avatar_url,role,status,token_version,created_at,last_login_at FROM users WHERE id=$1',[claims.id])).rows[0];
  if(!user)throw error('Phiên đăng nhập không còn hợp lệ.',401,'SESSION_EXPIRED');
  if(user.status==='blocked')throw error('Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ.',403,'ACCOUNT_BLOCKED');
  if(user.token_version!==claims.version)throw error('Phiên đăng nhập đã được thu hồi. Vui lòng đăng nhập lại.',401,'SESSION_EXPIRED');
  req.user=user;next();
 });
 const limit=(scope,max,identity=req=>req.ip)=>wrap(async(req,res,next)=>{
  const key=createHmac('sha256',secret).update(scope+':'+String(identity(req))).digest('hex');
  // Atomic bucket update works across API processes; never persist raw IP/email.
  await query('DELETE FROM auth_rate_limits WHERE expires_at < now()');
  const result=await query(`INSERT INTO auth_rate_limits(key_hash,hits,expires_at) VALUES($1,1,now()+interval '15 minutes')
   ON CONFLICT(key_hash) DO UPDATE SET hits=auth_rate_limits.hits+1 RETURNING hits,expires_at`,[key]);
  if(result.rows[0].hits>max){res.set('Retry-After',String(Math.max(1,Math.ceil((new Date(result.rows[0].expires_at)-Date.now())/1000))));throw error('Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',429,'RATE_LIMITED');}
  next();
 });
 async function transaction(action){
  const c=await pool.connect();
  try{await c.query('BEGIN');const result=await action(c);await c.query('COMMIT');return result;}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async function lockCurrent(c,req){
  const u=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0];
  if(!u||u.status!=='active'||u.token_version!==req.user.token_version)throw error('Phiên đăng nhập không còn hợp lệ.',401,'SESSION_EXPIRED');
  return u;
 }
 function registerRoutes(route){
  route.use('/auth',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
  route.post('/auth/register',limit('register',10),wrap(async(req,res)=>{
   const values=profileValues(req.body),email=normalizeEmail(req.body.email),pwdError=passwordError(req.body.password);
   if(values.error||!validEmail(email)||pwdError)throw error(values.error||(!validEmail(email)?'Email không hợp lệ.':pwdError));
   const passwordHash=await bcrypt.hash(req.body.password,12);
   try{
    const u=(await query('INSERT INTO users(name,email,phone,password_hash,last_login_at) VALUES($1,$2,$3,$4,now()) RETURNING *',[values.name,email,values.phone,passwordHash])).rows[0];
    res.status(201).json({user:publicUser(u),token:issueToken(u)});
   }catch(e){if(e.code==='23505')throw error('Email này đã được đăng ký.',409,'EMAIL_EXISTS');throw e;}
  }));
  route.post('/auth/login',limit('login',30),wrap(async(req,res)=>{
   const email=normalizeEmail(req.body.email),password=req.body.password;
   if(!validEmail(email)||typeof password!=='string'||Buffer.byteLength(password)>512)throw error('Email hoặc mật khẩu không đúng.',401,'INVALID_CREDENTIALS');
   const u=(await query('SELECT * FROM users WHERE lower(email)=$1',[email])).rows[0];
   const match=await bcrypt.compare(password,u?.password_hash||await dummyHash);
   if(!u||!match)throw error('Email hoặc mật khẩu không đúng.',401,'INVALID_CREDENTIALS');
   if(u.status!=='active')throw error('Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng để được hỗ trợ.',403,'ACCOUNT_BLOCKED');
   // Ensure a password change during bcrypt verification cannot issue a fresh session.
   const updated=(await query('UPDATE users SET last_login_at=now() WHERE id=$1 AND token_version=$2 AND password_hash=$3 AND status=$4 RETURNING *',[u.id,u.token_version,u.password_hash,'active'])).rows[0];
   if(!updated)throw error('Thông tin đăng nhập vừa thay đổi. Vui lòng thử lại.',401,'INVALID_CREDENTIALS');
   res.json({user:publicUser(updated),token:issueToken(updated)});
  }));
  route.get('/auth/me',authorize,(req,res)=>{res.set('Cache-Control','no-store');res.json(publicUser(req.user));});
  route.patch('/auth/me',authorize,limit('profile',30,req=>req.user.id),avatarUpload,wrap(async(req,res)=>{
   if(Object.keys(req.body).some(k=>!['name','phone','remove_avatar'].includes(k)))throw error('Chỉ có thể cập nhật tên, số điện thoại và ảnh đại diện.');
   const values=profileValues(req.body);
   if(values.error)throw error(values.error);
   if(req.body.remove_avatar!==undefined&&!['true','false',true,false].includes(req.body.remove_avatar))throw error('Yêu cầu xóa ảnh không hợp lệ.');
   const remove=req.body.remove_avatar===true||req.body.remove_avatar==='true';
   if(remove&&req.file)throw error('Chọn ảnh mới hoặc xóa ảnh hiện tại, không thực hiện cả hai cùng lúc.');
   let saved=null,obsolete=null,committed=false;
   try{
    if(req.file)saved=await saveAvatar(req.file);
    const user=await transaction(async c=>{
     const current=await lockCurrent(c,req),avatar=saved||(remove?null:current.avatar_url);
     if(current.avatar_url!==avatar)obsolete=current.avatar_url;
     return (await c.query('UPDATE users SET name=$1,phone=$2,avatar_url=$3,updated_at=now() WHERE id=$4 RETURNING *',[values.name,values.phone,avatar,current.id])).rows[0];
    });
    committed=true;
    if(obsolete)await removeAvatar(obsolete).catch(()=>console.warn('ACCOUNT_AVATAR_CLEANUP_FAILED'));
    res.json({user:publicUser(user),message:'Đã cập nhật hồ sơ.'});
   }finally{if(saved&&!committed)await removeAvatar(saved).catch(()=>{});}
  }));
  route.post('/auth/change-password',authorize,limit('change-password',5,req=>req.user.id),wrap(async(req,res)=>{
   const {current_password,new_password,confirm_password}=req.body;
   const issue=passwordError(new_password);
   if(issue)throw error(issue);
   if(new_password!==confirm_password)throw error('Mật khẩu xác nhận chưa khớp.');
   if(typeof current_password!=='string'||Buffer.byteLength(current_password)>512)throw error('Vui lòng nhập mật khẩu hiện tại.');
   await transaction(async c=>{
    const u=await lockCurrent(c,req);
    if(!await bcrypt.compare(current_password,u.password_hash))throw error('Mật khẩu hiện tại không đúng.',400,'CURRENT_PASSWORD_INVALID');
    if(await bcrypt.compare(new_password,u.password_hash))throw error('Mật khẩu mới phải khác mật khẩu hiện tại.');
    await c.query('UPDATE users SET password_hash=$1,token_version=token_version+1,updated_at=now() WHERE id=$2',[await bcrypt.hash(new_password,12),u.id]);
    await c.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[u.id]);
   });
   res.json({message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'});
  }));
  route.post('/auth/forgot-password',limit('forgot-ip',20),limit('forgot-email',3,req=>normalizeEmail(req.body.email)),wrap(async(req,res)=>{
   const email=normalizeEmail(req.body.email);
   if(!validEmail(email))throw error('Vui lòng nhập email hợp lệ.');
   const config=resetMailConfig();
   if(!config)throw error('Dịch vụ email chưa sẵn sàng. Vui lòng liên hệ cửa hàng hoặc thử lại sau.',503,'EMAIL_UNAVAILABLE');
   const token=randomBytes(32).toString('hex'),tokenHash=hash(token);
   const reset=await transaction(async c=>{
    const u=(await c.query('SELECT id,status,token_version FROM users WHERE lower(email)=$1 FOR UPDATE',[email])).rows[0];
    if(!u||u.status!=='active')return null;
    await c.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[u.id]);
    await c.query("DELETE FROM password_reset_tokens WHERE user_id=$1 AND expires_at<now()-interval '1 day'",[u.id]);
    return (await c.query("INSERT INTO password_reset_tokens(user_id,token_hash,token_version,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes') RETURNING id",[u.id,tokenHash,u.token_version])).rows[0];
   });
   if(reset){
    try{await sendResetEmail(email,token,config);}
    catch{
     await query('DELETE FROM password_reset_tokens WHERE id=$1',[reset.id]);
     // Do not log provider payloads, email addresses, credentials or reset links.
     console.warn('ACCOUNT_RESET_EMAIL_FAILED');
    }
   }
   res.status(202).json({message:genericReset});
  }));
  route.post('/auth/reset-password',limit('reset-password',20),wrap(async(req,res)=>{
   const {token,new_password,confirm_password}=req.body;
   if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))throw error('Liên kết không hợp lệ hoặc đã hết hạn.',400,'RESET_INVALID');
   const issue=passwordError(new_password);if(issue)throw error(issue);
   if(new_password!==confirm_password)throw error('Mật khẩu xác nhận chưa khớp.');
   const tokenHash=hash(token);
   await transaction(async c=>{
    // Lock user before token, matching change-password/forgot-password lock order.
    const reference=(await c.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=$1',[tokenHash])).rows[0];
    if(!reference)throw error('Liên kết không hợp lệ hoặc đã hết hạn.',400,'RESET_INVALID');
    const u=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[reference.user_id])).rows[0];
    const reset=(await c.query('SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[tokenHash])).rows[0];
    if(!u||u.status!=='active'||!reset||reset.token_version!==u.token_version)throw error('Liên kết không hợp lệ hoặc đã hết hạn.',400,'RESET_INVALID');
    if(await bcrypt.compare(new_password,u.password_hash))throw error('Mật khẩu mới phải khác mật khẩu hiện tại.');
    await c.query('UPDATE users SET password_hash=$1,token_version=token_version+1,updated_at=now() WHERE id=$2',[await bcrypt.hash(new_password,12),u.id]);
    await c.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[u.id]);
   });
   res.json({message:'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.'});
  }));
 }
 return {authorize,registerRoutes};
}
