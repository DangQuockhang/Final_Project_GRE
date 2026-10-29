export const normalizeEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
export function validEmail(value){return typeof value==='string'&&value.length<=255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
export function passwordError(value){
 if(typeof value!=='string'||value.length<8||!value.trim())return 'Mật khẩu cần ít nhất 8 ký tự.';
 if(Buffer.byteLength(value,'utf8')>72)return 'Mật khẩu quá dài (tối đa 72 byte UTF-8).';
 return '';
}
export function profileValues(body){
 const name=typeof body.name==='string'?body.name.trim():'';
 if(name.length<2||name.length>100||/[\x00-\x1f\x7f]/.test(name))return {error:'Tên cần từ 2 đến 100 ký tự, không chứa ký tự điều khiển.'};
 if(body.phone!=null&&typeof body.phone!=='string')return {error:'Số điện thoại không hợp lệ.'};
 const phone=(body.phone||'').replace(/[\s().-]/g,'');
 if(phone&&!/^\+?[0-9]{8,15}$/.test(phone))return {error:'Số điện thoại cần 8–15 chữ số, có thể bắt đầu bằng +.'};
 return {name,phone:phone||null};
}
export const publicUser=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone||null,avatar_url:u.avatar_url||null,role:u.role,status:u.status,created_at:u.created_at,last_login_at:u.last_login_at});
