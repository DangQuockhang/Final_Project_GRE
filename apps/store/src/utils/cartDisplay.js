// Present the current catalog product when available (fresh photo, sale price, brand).
// Local cart snapshots are retained as a fallback if the API is temporarily offline.
export function resolveCartProduct(entry,products=[]){
 const snapshot=entry?.product;
 if(!snapshot)return null;
 return products.find(p=>String(p.id)===String(snapshot.id)||p.slug===snapshot.slug)||snapshot;
}
export function effectivePrice(product){
 if(!product)return 0;
 const price=Number(product.price);
 const sale=product.sale_price==null?null:Number(product.sale_price);
 return Number.isFinite(sale)&&sale>=0&&sale<price?sale:price;
}
export function displayVariantColor(entry,product){
 const palette=new Set((product?.variants||[]).map(v=>String(v.color||'').trim().toLowerCase()).filter(Boolean));
 return palette.size>1?String(entry?.variant?.color||'').trim():'';
}
export function cartDisplayTotal(cart=[],products=[]){
 return cart.reduce((sum,entry)=>sum+effectivePrice(resolveCartProduct(entry,products))*Number(entry.quantity||0),0);
}
