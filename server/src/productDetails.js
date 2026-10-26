// Structured content only: no raw HTML or remote image fetching.
export function validateDetails(blocks,files,existing=[]){
 const bad=message=>{const e=new Error(message);e.status=400;throw e;};
 if(!Array.isArray(blocks)||blocks.length>40)bad('Use at most 40 detail blocks.');
 const owned=new Set(existing.filter(b=>b.type==='image').map(b=>b.url));
 const used=new Set();let chars=0,images=0;
 const result=blocks.map(b=>{
  if(!b||!['paragraph','heading','image'].includes(b.type))bad('Invalid detail block.');
  if(b.type!=='image'){
   if(typeof b.text!=='string')bad('Invalid detail text.');
   chars+=b.text.length;
   return {type:b.type,text:b.text};
  }
  images++;
  const caption=b.caption??'';
  if(typeof caption!=='string'||caption.length>300)bad('Image caption must be under 300 characters.');
  if(b.upload_index!==undefined){
   if(!Number.isInteger(b.upload_index)||b.upload_index<0||b.upload_index>=files.length||used.has(b.upload_index))bad('Invalid detail image upload.');
   used.add(b.upload_index);
   return {type:'image',upload_index:b.upload_index,caption};
  }
  if(typeof b.url!=='string'||!owned.has(b.url))bad('Detail image does not belong to this product.');
  return {type:'image',url:b.url,caption};
 });
 if(chars>12000||images>10||used.size!==files.length)bad('Details allow 12000 characters and 10 images; each upload must be used once.');
 return result;
}
