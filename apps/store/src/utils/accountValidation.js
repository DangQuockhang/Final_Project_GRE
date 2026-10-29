export function validatePassword(value){
 if(typeof value!=='string'||value.length<8||!value.trim())return 'Mật khẩu cần ít nhất 8 ký tự.';
 if(new TextEncoder().encode(value).length>72)return 'Mật khẩu quá dài (tối đa 72 byte UTF-8).';
 return '';
}
export function validateName(name){return !name||name.trim().length<2||name.trim().length>100||/[\x00-\x1f\x7f]/.test(name)?'Tên cần từ 2 đến 100 ký tự.':'';}
export function validateEmail(email){return !email||email.trim().length>255||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())?'Vui lòng nhập email hợp lệ.':'';}
export function validatePhone(phone){return phone&&!/^\+?[0-9]{8,15}$/.test(phone.replace(/[\s().-]/g,''))?'Số điện thoại cần 8–15 chữ số, có thể bắt đầu bằng +.':'';}
