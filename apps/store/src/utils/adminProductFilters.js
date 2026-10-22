// Product Inventory filters are combined: search AND brand AND status.
// Compare stable brand IDs, never names, because brands may be renamed.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLocaleLowerCase('vi').trim();
export function filterAdminProducts(products=[],{search='',status='all',brandId='all'}={}){
 const needle=normalize(search);
 return (products||[]).filter(product=>{
  if(status!=='all'&&product.status!==status)return false;
  if(brandId!=='all'&&String(product.brand_id)!==String(brandId))return false;
  return !needle||normalize([product.name,product.brand_name,product.slug].join(' ')).includes(needle);
 });
}
