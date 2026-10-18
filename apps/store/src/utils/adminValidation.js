export const PRODUCT_CATEGORIES = ['accessories','bags','clothing','shoes'];
export const PRODUCT_STATUSES = ['draft','active','archived'];
export const ORDER_TRANSITIONS = Object.freeze({
  PENDING:['CONFIRMED','CANCELLED'],
  CONFIRMED:['SHIPPED','CANCELLED'],
  SHIPPED:['DELIVERED'],
  DELIVERED:[],
  CANCELLED:[]
});

export function validateBrand({name='',description=''}={}){
  if(String(name).trim().length<2||String(name).trim().length>120)
    return 'Tên brand phải có từ 2 đến 120 ký tự.';
  if(String(description).length>1000)
    return 'Mô tả brand tối đa 1000 ký tự.';
  return '';
}
export function validateProduct(product={}){
  if(String(product.name??'').trim().length<3)
    return 'Tên sản phẩm phải có ít nhất 3 ký tự.';
  if(!Number.isSafeInteger(Number(product.brand_id))||Number(product.brand_id)<=0)
    return 'Hãy chọn thương hiệu hợp lệ.';
  if(!PRODUCT_CATEGORIES.includes(product.category))
    return 'Danh mục sản phẩm không hợp lệ.';
  if(!/^\d+$/.test(String(product.price??'')) || !Number.isSafeInteger(Number(product.price)))
    return 'Giá sản phẩm phải là số nguyên VND không âm.';
  if(product.sale_price!==''&&product.sale_price!==null&&product.sale_price!==undefined&&
    (!/^\d+$/.test(String(product.sale_price))||!Number.isSafeInteger(Number(product.sale_price))||Number(product.sale_price)>=Number(product.price)))
    return 'Sale price must be lower than original price.';
  if(String(product.product_type??'').length>60)
    return 'Product type must be 60 characters or fewer.';
  if(!/^#[a-f0-9]{6}$/i.test(String(product.color??'')))
    return 'Mã màu phải đúng định dạng #RRGGBB.';
  if(!PRODUCT_STATUSES.includes(product.status))
    return 'Trạng thái sản phẩm không hợp lệ.';
  if(String(product.description??'').length>2000)
    return 'Mô tả sản phẩm tối đa 2000 ký tự.';
  return '';
}
export function validateStock(stock){
  if(!/^\d+$/.test(String(stock??''))||!Number.isSafeInteger(Number(stock)))
    return 'Tồn kho phải là số nguyên không âm.';
  return '';
}
export function validateVariant(variant={}){
  if(!String(variant.sku??'').trim())return 'Hãy nhập SKU cho biến thể.';
  if(String(variant.sku).trim().length>80)return 'SKU quá dài (tối đa 80 ký tự).';
  if(!String(variant.size??'').trim())return 'Hãy nhập size.';
  if(!String(variant.color??'').trim())return 'Hãy nhập màu.';
  const stockError=validateStock(variant.stock);
  if(stockError)return stockError;
  if(String(variant.chest_cm??'').trim()!=='' &&
    (!Number.isFinite(Number(variant.chest_cm))||Number(variant.chest_cm)<=0))
    return 'Vòng ngực phải lớn hơn 0 cm hoặc để trống.';
  return '';
}
export function adminMetrics(products=[],orders=[]){
  const active=products.filter(p=>p.status==='active').length;
  const variants=products.flatMap(p=>Array.isArray(p.variants)?p.variants:[]);
  const lowStock=variants.filter(v=>Number(v.stock)>0&&Number(v.stock)<=3).length;
  const pending=orders.filter(o=>o.status==='PENDING').length;
  const deliveredValue=orders.filter(o=>o.status==='DELIVERED').reduce((sum,o)=>sum+Number(o.total||0),0);
  return {active,lowStock,pending,deliveredValue};
}
