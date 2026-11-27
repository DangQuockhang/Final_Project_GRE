export const normalizeEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
export function validEmail(value){return typeof value==='string'&&value.length<=255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
export function passwordError(value){
 if(typeof value!=='string'||value.length<8||!value.trim())return 'Use at least 8 characters for your password.';
 if(Buffer.byteLength(value,'utf8')>72)return 'Password is too long (maximum 72 UTF-8 bytes).';
 return '';
}
export function profileValues(body){
 const name=typeof body.name==='string'?body.name.trim():'';
 if(name.length<2||name.length>100||/[\x00-\x1f\x7f]/.test(name))return {error:'Name must contain 2–100 characters without control characters.'};
 if(body.phone!=null&&typeof body.phone!=='string')return {error:'Invalid phone number.'};
 const phone=(body.phone||'').replace(/[\s().-]/g,'');
 if(phone&&!/^\+?[0-9]{8,15}$/.test(phone))return {error:'Phone number must contain 8–15 digits and may start with +.'};
 return {name,phone:phone||null};
}
export const publicUser=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone||null,avatar_url:u.avatar_url||null,role:u.role,status:u.status,created_at:u.created_at,last_login_at:u.last_login_at});
