const normalize = s => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function filterProducts(products=[],brands=[],filters={}){
 const {q='',brand='',category='',type='',price='',size='',stock='',sale='',sort='featured'}=filters;
 const brandMatch=brands.find(b=>b.slug===brand);
 const result=products.filter(p=>{
   if(p.status && p.status!=='active')return false;
   if(brand&&(!brandMatch||String(p.brand_id)!==String(brandMatch.id)))return false;
   if(category&&p.category!==category)return false;
   if(type&&String(p.product_type||'').toLowerCase()!==type.toLowerCase())return false;
   if(sale==='1'&&!(p.sale_price!=null&&Number(p.sale_price)<Number(p.price)))return false;
   if(q.trim()&&!normalize([p.name,p.brand_name,p.description].join(' ')).includes(normalize(q.trim())))return false;
   const n=Number(p.sale_price??p.price);
   if(price==='under1500'&&n>=1500000)return false;
   if(price==='mid'&&(n<1500000||n>2500000))return false;
   if(price==='over2500'&&n<=2500000)return false;
   const variants=Array.isArray(p.variants)?p.variants:[];
   if(size&&!variants.some(v=>v.size===size&&Number(v.stock)>0))return false;
   if(stock==='available'&&!variants.some(v=>Number(v.stock)>0))return false;
   if(stock==='soldout'&&variants.some(v=>Number(v.stock)>0))return false;
   return true;
 });
 const ordered=[...result];
 if(sort==='low')ordered.sort((a,b)=>Number(a.sale_price??a.price)-Number(b.sale_price??b.price));
 if(sort==='high')ordered.sort((a,b)=>Number(b.sale_price??b.price)-Number(a.sale_price??a.price));
 if(sort==='name')ordered.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 return ordered;
}
export function paginateProducts(products,page=1,pageSize=8){
 const limit=Math.max(1,Number(pageSize)||8);
 const totalPages=Math.max(1,Math.ceil(products.length/limit));
 const n=Number(page);
 const current=Number.isFinite(n)?Math.max(1,Math.min(totalPages,Math.floor(n))):1;
 return {items:products.slice((current-1)*limit,current*limit),page:current,totalPages,total:products.length};
}
