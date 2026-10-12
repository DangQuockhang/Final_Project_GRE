export function productImageUrl(value,api='http://localhost:4000/api'){
 if(typeof value!=='string')return null;
 if(/^https?:\/\//i.test(value)){try{return new URL(value).href;}catch{return null;}}
 if(!/^\/media\/products\/[a-f0-9-]{36}\.(png|jpg|webp)$/i.test(value))return null;
 try{return new URL(value,new URL(api).origin).href;}catch{return null;}
}
