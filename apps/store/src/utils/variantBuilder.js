// Catalog SKU editor: a product may have no customer-facing color choices.
// PostgreSQL still requires a nonempty internal color for each SKU.
export const INTERNAL_COLOR = 'Standard';
export const hasOptionalSize=category=>['accessories','bags'].includes(category);
export const FALLBACK_HEX = '#758073';
const norm=value=>String(value??'').trim().toLowerCase();
const slug=value=>norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'item';

export const hasMultipleColors=variants=>
 new Set((variants||[]).map(v=>norm(v.color)).filter(Boolean)).size>1;

export function buildVariantMatrix({name,sizes,colors=[],rows=[],defaultStock=0,multipleColors=false,category,skuPrefix=''}){
 const parsed=[...new Map(String(sizes||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>[norm(x),x])).values()];
 if(!parsed.length&&hasOptionalSize(category))parsed.push('ONE SIZE');
 if(!parsed.length||parsed.some(size=>size.length>20))
  throw new Error('Enter valid sizes, for example ONE SIZE or S, M, L.');
 const stock=Number(defaultStock);
 if(!Number.isSafeInteger(stock)||stock<0)
  throw new Error('Default stock must be a non-negative whole number.');
 const uniqueExisting=[...new Map(rows.filter(r=>r.color).map(r=>[norm(r.color),r.color])).values()];
 if(!multipleColors&&uniqueExisting.length>1)
  throw new Error('This product has several SKU colors. Remove unwanted color variants before turning color options off.');
 let variants;
 if(multipleColors){
  if(!colors.length||colors.some(c=>!String(c.name||'').trim()||String(c.name).length>40||!/^#[0-9a-f]{6}$/i.test(String(c.hex||''))) )
   throw new Error('Add valid color names and color swatches before generating variants.');
  if(new Set(colors.map(c=>norm(c.name))).size!==colors.length)
   throw new Error('Each color name must be unique.');
  variants=colors.map(c=>({name:c.name.trim(),hex:c.hex}));
 }else{
  // Keep a single existing SKU color as-is to preserve SKU/order history.
  const color=uniqueExisting[0]||INTERNAL_COLOR;
  variants=[{name:color,hex:rows.find(r=>norm(r.color)===norm(color))?.color_hex||null}];
 }
 if(parsed.length*variants.length>80)
  throw new Error('Maximum 80 SKU combinations per product.');
 // A duplicate keeps its own SKU namespace when adding sizes/colors or rebuilding.
 // Reserve all existing rows first, including any SKU the admin has edited.
 const reservedSkus=new Set(rows.map(row=>norm(row.sku)));
 let nextSku=1;
 const makeSku=(color,size)=>{
  if(!skuPrefix)return slug(name||'product')+'-'+slug(color)+'-'+slug(size);
  let candidate;
  do{candidate=skuPrefix+'-'+String(nextSku++).padStart(2,'0');}while(reservedSkus.has(norm(candidate)));
  reservedSkus.add(norm(candidate));
  return candidate;
 };
 const generated=variants.flatMap(c=>parsed.map(size=>{
  const old=rows.find(r=>norm(r.color)===norm(c.name)&&norm(r.size)===norm(size));
  if(old)return {...old,color:c.name,color_hex:multipleColors?c.hex:(old.color_hex||null)};
  return {sku:makeSku(c.name,size),size,color:c.name,color_hex:multipleColors?c.hex:null,stock:String(stock)};
 }));
 // Keep order-linked or historical SKUs rather than silently discarding them.
 const untouched=rows.filter(r=>r.id!=null&&!generated.some(g=>String(g.id)===String(r.id)));
 return [...generated,...untouched];
}
