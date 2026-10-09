// FICTIONAL DEMO LABELS: not partner brands or licensed product catalog.
export const demoBrands = [
  { id:1, name:'ATELIER NORTH', slug:'atelier-north', description:'Understated international-inspired essentials. Fictional demonstration label.' },
  { id:2, name:'MONO OBJECT', slug:'mono-object', description:'Clean accessories & crafted simplicity. Fictional demonstration label.' },
  { id:3, name:'FORM / STUDIO', slug:'form-studio', description:'Contemporary silhouettes. Fictional demonstration label.' },
];
const sizes=['S','M','L','XL'];
const chest={S:98,M:106,L:114,XL:122};
function variants(slug,kind='top') { return (kind==='top'?sizes:['ONE SIZE']).map((size,i)=>({id:`demo-${slug}-${size}`,sku:`${slug.toUpperCase().replace(/-/g,'_')}_${size}`,size,color:'Onyx',stock:5+i*2,chest_cm:kind==='top'?chest[size]:null})); }
export const demoProducts = [
 {id:'demo-tee',slug:'essential-sculpt-tee',name:'Essential Sculpt Tee',brand_id:1,brand_name:'ATELIER NORTH',category:'tops',price:1450000,description:'Áo thun form relaxed, tạo hình mẫu cho 3D fitting. Chưa phải hàng bán thật.',color:'#474a42',status:'active',tryon_enabled:true,variants:variants('essential-sculpt-tee')},
 {id:'demo-overshirt',slug:'structured-overshirt',name:'Structured Overshirt',brand_id:3,brand_name:'FORM / STUDIO',category:'outerwear',price:2750000,description:'Overshirt contemporary phối cùng trang phục tối giản.',color:'#7b776a',status:'active',tryon_enabled:true,variants:variants('structured-overshirt')},
 {id:'demo-polo',slug:'modern-knit-polo',name:'Modern Knit Polo',brand_id:1,brand_name:'ATELIER NORTH',category:'tops',price:1950000,description:'Polo dệt kim mang tính minh họa.',color:'#c2baa7',status:'active',tryon_enabled:true,variants:variants('modern-knit-polo')},
 {id:'demo-pants',slug:'wide-leg-trousers',name:'Wide Leg Trousers',brand_id:3,brand_name:'FORM / STUDIO',category:'bottoms',price:2350000,description:'Quần suông thiết kế hiện đại.',color:'#747875',status:'active',tryon_enabled:false,variants:variants('wide-leg-trousers','other')},
 {id:'demo-bag',slug:'urban-crossbody',name:'Urban Crossbody',brand_id:2,brand_name:'MONO OBJECT',category:'accessories',price:1690000,description:'Túi đeo chéo kiểu dáng gọn.',color:'#343835',status:'active',tryon_enabled:false,variants:variants('urban-crossbody','other')},
 {id:'demo-cap',slug:'everyday-cap',name:'Everyday Cap',brand_id:2,brand_name:'MONO OBJECT',category:'accessories',price:950000,description:'Mũ lưỡi trai tối giản.',color:'#9e9283',status:'active',tryon_enabled:false,variants:variants('everyday-cap','other')},
];
export const money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
export const apiBase='http://localhost:4000/api';

export {filterProducts,paginateProducts} from './filters.js';
