// Duplicate into a *new* draft; never keep source IDs, purchased SKU IDs,
// active listing state, stock numbers or shared image file references.
const slug=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product';
export function duplicateProduct(source,token){
 if(!source?.id||!token||!String(token).match(/^[a-z0-9-]{3,24}$/i))throw new Error('Invalid duplicate source or token.');
 const name=String(source.name||'Product').slice(0,145)+' (Copy)';
 const uniqueSuffix='copy-'+String(token).toLowerCase();
 const variants=(source.variants||[]).map((v,i)=>({
  // Intentionally do not propagate v.id or purchased stock.
  sku:('KD-'+uniqueSuffix+'-'+String(i+1).padStart(2,'0')).slice(0,95),
  size:v.size,
  color:v.color||'Standard',
  color_hex:v.color_hex||null,
  stock:'0',
  chest_cm:v.chest_cm??null
 }));
 return {
  token:String(token).toLowerCase(),
  draft:{
   name,brand_id:String(source.brand_id),category:source.category,
   product_type:source.product_type||'',price:String(source.price),
   sale_price:source.sale_price==null?'':String(source.sale_price),
   description:source.description||'',status:'draft'
  },
  rows:variants,
  sizes:[...new Set(variants.map(v=>v.size))].join(', ')||'ONE SIZE',
  // The server validates slugs and ensures unique identifiers.
  getSlug:(draftName)=>slug(draftName)+'-'+uniqueSuffix
 };
}
