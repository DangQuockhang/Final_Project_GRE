export function validatePassword(value){
 if(typeof value!=='string'||value.length<8||!value.trim())return 'Use at least 8 characters for your password.';
 if(new TextEncoder().encode(value).length>72)return 'Password is too long (maximum 72 UTF-8 bytes).';
 return '';
}
export function validateName(name){return !name||name.trim().length<2||name.trim().length>100||/[\x00-\x1f\x7f]/.test(name)?'Name must contain 2–100 characters.':'';}
export function validateEmail(email){return !email||email.trim().length>255||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())?'Enter a valid email address.':'';}
export function validatePhone(phone){return phone&&!/^\+?[0-9]{8,15}$/.test(phone.replace(/[\s().-]/g,''))?'Phone number must contain 8–15 digits and may start with +.':'';}
