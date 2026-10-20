// Shared Brand directory utilities for Admin and public catalog.
// Filters/sorts are computed client-side from the already loaded catalog.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const validSorts=['name-asc','name-desc','newest','oldest','products-desc','products-asc'];

export function brandProductCounts(products=[],{activeOnly=false}={}){
 const counts=new Map();
 for(const product of products||[]){
  if(!product?.brand_id||(activeOnly&&product.status!=='active'))continue;
  const key=String(product.brand_id);
  counts.set(key,(counts.get(key)||0)+1);
 }
 return counts;
}
export function filterSortBrands(brands=[],products=[],{
 query='',logo='all',productsFilter='all',sort='name-asc',activeOnly=false
}={}){
 const countByBrand=brandProductCounts(products,{activeOnly});
 const needle=normalize(query);
 const sorted=(brands||[]).filter(brand=>{
  const count=countByBrand.get(String(brand.id))||0;
  if(needle&&!normalize([brand.name,brand.slug,brand.description].join(' ')).includes(needle))return false;
  if(logo==='with'&&!brand.logo_url)return false;
  if(logo==='without'&&brand.logo_url)return false;
  if(productsFilter==='with'&&count===0)return false;
  if(productsFilter==='without'&&count>0)return false;
  return true;
 }).slice();
 const textCompare=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'en',{sensitivity:'base'});
 const countOf=b=>countByBrand.get(String(b.id))||0;
 const dateOf=b=>{
  const ms=Date.parse(b.created_at||'');
  return Number.isFinite(ms)?ms:(Number(b.id)||0);
 };
 const sortBy=validSorts.includes(sort)?sort:'name-asc';
 sorted.sort((a,b)=>{
  let result=0;
  switch(sortBy){
   case 'name-desc': result=-textCompare(a,b);break;
   case 'newest': result=dateOf(b)-dateOf(a);break;
   case 'oldest': result=dateOf(a)-dateOf(b);break;
   case 'products-desc': result=countOf(b)-countOf(a);break;
   case 'products-asc': result=countOf(a)-countOf(b);break;
   default:result=textCompare(a,b);
  }
  return result||textCompare(a,b)||Number(a.id||0)-Number(b.id||0);
 });
 return {brands:sorted,countByBrand};
}
