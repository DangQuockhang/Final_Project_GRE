export const ADMIN_SECTIONS=['overview','orders','products','inventory','best-sellers','catalog-health','collections','brands'];
export function adminPath(section='overview',options={}){
 const selected=ADMIN_SECTIONS.includes(section)?section:'overview';
 const query=new URLSearchParams();
 for(const key of ['id','create','search','page','status','payment_status','payment_method','filter','sort','days']){
  const value=options[key];
  if(value!==undefined&&value!==null&&value!==false&&value!=='')query.set(key,value===true?'1':String(value));
 }
 return '/admin'+(selected==='overview'?'':'/'+selected)+(query.size?'?'+query:'');
}
export function adminSection(pathname){
 const segments=pathname.split('/').filter(Boolean);
 if(segments[0]!=='admin'||segments.length>2)return null;
 const section=segments[1]||'overview';
 return ADMIN_SECTIONS.includes(section)?section:null;
}
export function adminReturnPath(value,fallback='/admin'){
 if(typeof value!=='string'||!/^\/admin(?:\/|\?|$)/.test(value))return fallback;
 const url=new URL(value,'https://local.invalid');
 return url.origin==='https://local.invalid'&&adminSection(url.pathname)?url.pathname+url.search:fallback;
}
