import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {pool,query} from './db.js';
import 'dotenv/config';
import {imageDir,detectImage,imageUpload,galleryUpload,saveImage,removeImage} from './productImages.js';
import {evaluateProductDeletion} from './productDeletion.js';

const app=express();
const PORT=Number(process.env.PORT||4000);
const JWT_SECRET=process.env.JWT_SECRET||'';
if (JWT_SECRET.length<32) console.warn('Cảnh báo: JWT_SECRET phải từ 32 ký tự, không nên dùng trong production.');
app.use(cors({origin:(process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://localhost:5174').split(',').map(x=>x.trim())}));
app.use(express.json({limit:'100kb'}));
app.use('/media/products',express.static(imageDir,{fallthrough:false,setHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public,max-age=86400');}}));
const route=express.Router();app.use('/api',route);
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const fail=(res,msg,status=400)=>res.status(status).json({error:msg});
const isId=v=>/^\d+$/.test(String(v))&&Number(v)>0;
const clean=v=>String(v||'').trim();
const slugify=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const validPrice=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0;
const validSale=(value,price)=>value===null||(Number.isSafeInteger(Number(value))&&Number(value)>=0&&Number(value)<Number(price));

function authorize(req,res,next){
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  try {if(!JWT_SECRET) throw Error();req.user=jwt.verify(token,JWT_SECRET,{algorithms:['HS256']});next();}
  catch{return fail(res,'Vui lòng đăng nhập.',401);}
}
function admin(req,res,next){if(req.user?.role!=='admin')return fail(res,'Chỉ Admin được truy cập.',403);next();}
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
const issueToken=u=>jwt.sign(safeUser(u),JWT_SECRET,{algorithm:'HS256',expiresIn:'8h'});
route.get('/health',wrap(async(req,res)=>{await query('SELECT 1');res.json({ok:true,service:'kd-api'});}));

route.post('/auth/register',wrap(async(req,res)=>{
 const name=clean(req.body.name),email=clean(req.body.email).toLowerCase(),password=req.body.password||'';
 if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>128)return fail(res,'Tên, email hoặc mật khẩu không hợp lệ (mật khẩu >= 8 ký tự).');
 const hash=await bcrypt.hash(password,12);
 try{const r=await query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING *',[name,email,hash]);res.status(201).json({user:safeUser(r.rows[0]),token:issueToken(r.rows[0])});}
 catch(e){if(e.code==='23505')return fail(res,'Email đã được đăng ký.',409);throw e;}
}));
route.post('/auth/login',wrap(async(req,res)=>{
 const r=await query('SELECT * FROM users WHERE email=$1',[clean(req.body.email).toLowerCase()]);
 const u=r.rows[0];if(!u||!await bcrypt.compare(req.body.password||'',u.password_hash))return fail(res,'Email hoặc mật khẩu không đúng.',401);
 res.json({user:safeUser(u),token:issueToken(u)});
}));
route.get('/auth/me',authorize,wrap(async(req,res)=>{
 const r=await query('SELECT id,name,email,role FROM users WHERE id=$1',[req.user.id]);if(!r.rows[0])return fail(res,'Tài khoản không tồn tại.',401);res.json(r.rows[0]);
}));

route.get('/brands',wrap(async(req,res)=>{const r=await query('SELECT * FROM brands ORDER BY name');res.json(r.rows);}));
route.post('/brands',authorize,admin,wrap(async(req,res)=>{
 const name=clean(req.body.name);if(name.length<2||name.length>120)return fail(res,'Tên brand cần 2–120 ký tự.');
 const slug=slugify(req.body.slug||name);if(!slug)return fail(res,'Slug không hợp lệ.');
 try{const r=await query('INSERT INTO brands(name,slug,description) VALUES($1,$2,$3) RETURNING *',[name,slug,clean(req.body.description)]);res.status(201).json(r.rows[0]);}
 catch(e){if(e.code==='23505')return fail(res,'Brand hoặc slug đã tồn tại.',409);throw e;}
}));
route.patch('/brands/:id',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'ID không hợp lệ.');
 const allowed=['name','description'];const values=allowed.filter(k=>req.body[k]!==undefined).map(k=>clean(req.body[k]));const fields=allowed.filter(k=>req.body[k]!==undefined);
 if(!fields.length)return fail(res,'Không có trường cần cập nhật.');
 if(fields.includes('name')&&values[fields.indexOf('name')].length<2)return fail(res,'Tên quá ngắn.');
 const r=await query(`UPDATE brands SET ${fields.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${fields.length+1} RETURNING *`,[...values,req.params.id]);
 if(!r.rows[0])return fail(res,'Không tìm thấy brand.',404);res.json(r.rows[0]);
}));
route.delete('/brands/:id',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'ID không hợp lệ.');
 const count=await query('SELECT COUNT(*)::int AS n FROM products WHERE brand_id=$1',[req.params.id]);if(count.rows[0].n>0)return fail(res,'Brand còn sản phẩm, không thể xóa.',409);
 const r=await query('DELETE FROM brands WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,'Không tìm thấy brand.',404);res.json({ok:true});
}));

const baseSelect=`SELECT p.*,b.name AS brand_name,b.slug AS brand_slug, COALESCE((SELECT json_agg(json_build_object('id',v.id,'sku',v.sku,'size',v.size,'color',v.color,'chest_cm',v.chest_cm,'stock',v.stock) ORDER BY v.id) FROM product_variants v WHERE v.product_id=p.id),'[]'::json) AS variants, COALESCE((SELECT json_agg(json_build_object('id',i.id,'image_url',i.image_url,'position',i.position) ORDER BY i.position,i.id) FROM product_images i WHERE i.product_id=p.id),'[]'::json) AS images FROM products p JOIN brands b ON b.id=p.brand_id`;
route.get('/products',wrap(async(req,res)=>{
 const where=[`p.status='active'`],params=[];
 if(req.query.brand){params.push(clean(req.query.brand));where.push(`b.slug=$${params.length}`);}
 if(req.query.q){params.push(`%${clean(req.query.q)}%`);where.push(`(p.name ILIKE $${params.length} OR b.name ILIKE $${params.length})`);}
 if(req.query.category){params.push(clean(req.query.category));where.push(`p.category=$${params.length}`);}
 const r=await query(`${baseSelect} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC,p.id DESC LIMIT 100`,params);res.json(r.rows);
}));
route.get('/admin/products',authorize,admin,wrap(async(req,res)=>{
 const r=await query(`${baseSelect} ORDER BY p.id DESC LIMIT 200`);res.json(r.rows);
}));
route.get('/products/:slug',wrap(async(req,res)=>{
 const r=await query(`${baseSelect} WHERE p.slug=$1 AND p.status='active'`,[req.params.slug]);if(!r.rows[0])return fail(res,'Không tìm thấy sản phẩm.',404);res.json(r.rows[0]);
}));
route.post('/products',authorize,admin,wrap(async(req,res)=>{
 const {name,category,description,brand_id}=req.body;
 if(clean(name).length<3||!isId(brand_id)||!['tops','bottoms','outerwear','accessories','footwear'].includes(category)||!validPrice(req.body.price))return fail(res,'Thông tin sản phẩm không hợp lệ.');
 const slug=slugify(req.body.slug||name);if(!slug)return fail(res,'Slug không hợp lệ.');
 const sale=req.body.sale_price==null||req.body.sale_price===''?null:Number(req.body.sale_price);
 if(!validSale(sale,req.body.price))return fail(res,'Sale price must be lower than original price.');
 const type=clean(req.body.product_type);if(type.length>60)return fail(res,'Product type is too long.');
 try {
 const r=await query(`INSERT INTO products(name,slug,brand_id,category,price,description,color,status,tryon_enabled,sale_price,product_type)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[
 clean(name),slug,brand_id,category,Number(req.body.price),clean(description),/^#[0-9a-f]{6}$/i.test(req.body.color||'')?req.body.color:'#7b807a',
 req.body.status==='draft'?'draft':'active',Boolean(req.body.tryon_enabled),sale,type||null]);
 res.status(201).json(r.rows[0]);
 } catch(e){if(e.code==='23505')return fail(res,'Slug sản phẩm đã tồn tại.',409);if(e.code==='23503')return fail(res,'Brand không tồn tại.',400);throw e;}
}));
route.patch('/products/:id',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'ID không hợp lệ.');
 const allowed=['name','description','price','status','color','tryon_enabled','brand_id','category','sale_price','product_type'];
 const fields=allowed.filter(k=>Object.hasOwn(req.body,k));if(!fields.length)return fail(res,'Không có trường cần cập nhật.');
 if('price'in req.body&&!validPrice(req.body.price))return fail(res,'Giá không hợp lệ.');
 if('product_type'in req.body&&clean(req.body.product_type).length>60)return fail(res,'Product type is too long.');
 if('sale_price'in req.body||'price'in req.body){
  const existing=await query('SELECT price,sale_price FROM products WHERE id=$1',[req.params.id]);
  if(!existing.rows[0])return fail(res,'Product not found.',404);
  const price='price'in req.body?Number(req.body.price):existing.rows[0].price;
  const sale='sale_price'in req.body?(req.body.sale_price==null||req.body.sale_price===''?null:Number(req.body.sale_price)):existing.rows[0].sale_price;
  if(!validSale(sale,price))return fail(res,'Sale price must be lower than the original price.');
  if('sale_price'in req.body)req.body.sale_price=sale;
 }
 if('product_type'in req.body)req.body.product_type=clean(req.body.product_type)||null;
 if('status'in req.body&&!['active','draft','archived'].includes(req.body.status))return fail(res,'Trạng thái không hợp lệ.');
 if('category'in req.body&&!['tops','bottoms','outerwear','accessories','footwear'].includes(req.body.category))return fail(res,'Danh mục không hợp lệ.');
 if('color'in req.body&&!/^#[0-9a-f]{6}$/i.test(req.body.color))return fail(res,'Màu không hợp lệ.');
 const r=await query(`UPDATE products SET ${fields.map((f,i)=>`${f}=$${i+1}`).join(',')} WHERE id=$${fields.length+1} RETURNING *`,[...fields.map(f=>req.body[f]),req.params.id]);
 if(!r.rows[0])return fail(res,'Không tìm thấy sản phẩm.',404);res.json(r.rows[0]);
}));
route.delete('/products/:id',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'ID không hợp lệ.');
 const r=await query(`UPDATE products SET status='archived' WHERE id=$1 RETURNING id`,[req.params.id]);
 if(!r.rows[0])return fail(res,'Không tìm thấy sản phẩm.',404);res.json({ok:true,method:'soft-delete'});
}));
// A preflight check is informative only; the DELETE route rechecks under locks.
route.get('/admin/products/:id/delete-check',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'Invalid product ID.');
 const result=await query('SELECT p.id,p.name,p.status, (SELECT COALESCE(SUM(v.stock),0)::int FROM product_variants v WHERE v.product_id=p.id) AS stock, (SELECT COUNT(*)::int FROM order_items oi JOIN product_variants v ON v.id=oi.variant_id WHERE v.product_id=p.id) AS order_items FROM products p WHERE p.id=$1',[req.params.id]);
 const p=result.rows[0];
 if(!p)return fail(res,'Product not found.',404);
 res.json({id:p.id,name:p.name,status:p.status,stock:p.stock,orderItems:p.order_items,...evaluateProductDeletion({status:p.status,stock:p.stock,orderItems:p.order_items})});
}));
route.delete('/admin/products/:id/permanent',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'Invalid product ID.');
 const client=await pool.connect();
 let removed=null;
 let auditId=null;
 try{
  await client.query('BEGIN');
  // Lock parent row first: prevents new variant foreign-key inserts.
  const found=await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE',[req.params.id]);
  const product=found.rows[0];
  if(!product){await client.query('ROLLBACK');return fail(res,'Product not found.',404);}
  // Serializes checkout reservations and concurrent stock edits on variants.
  const variants=await client.query('SELECT * FROM product_variants WHERE product_id=$1 ORDER BY id FOR UPDATE',[product.id]);
  const stock=variants.rows.reduce((n,v)=>n+Number(v.stock),0);
  const ordered=await client.query('SELECT COUNT(*)::int AS n FROM order_items oi JOIN product_variants v ON v.id=oi.variant_id WHERE v.product_id=$1',[product.id]);
  const orderItems=ordered.rows[0].n;
  const decision=evaluateProductDeletion({status:product.status,stock,orderItems});
  if(!decision.eligible){await client.query('ROLLBACK');return res.status(409).json({error:decision.reason,...decision,stock,orderItems});}
  const galleryImages=(await client.query('SELECT image_url FROM product_images WHERE product_id=$1',[product.id])).rows.map(r=>r.image_url);
  const audit=await client.query('INSERT INTO product_deletion_audit (product_id,product_name,product_slug,deleted_by,snapshot) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id',[
   product.id,product.name,product.slug,req.user.id,JSON.stringify({product,variants:variants.rows})
  ]);
  auditId=audit.rows[0].id;
  // Only unused SKU rows cascade; order_items FK protects history.
  await client.query('DELETE FROM products WHERE id=$1',[product.id]);
  await client.query('COMMIT');
  removed={...product,allImageUrls:[product.image_url,...galleryImages]};
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  if(error.code==='23503')return fail(res,'Product is linked to order data. Archive it instead.',409);
  throw error;
 }finally{client.release();}
 // Never touch the product image before database commit succeeds.
 await Promise.all([...new Set(removed.allImageUrls)].filter(Boolean).map(url=>removeImage(url).catch(e=>console.error('Product image cleanup failed:',e))));
 res.json({ok:true,method:'permanent-delete',id:removed.id,audit_id:auditId});
}));

// Product galleries: Admin-only multipart uploads, maximum 8 extra pictures.
route.post('/admin/products/:id/images',authorize,admin,galleryUpload,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'Invalid product ID.');
 if(!req.files?.length)return fail(res,'Choose at least one product image.');
 const prepared=req.files.map(file=>({buffer:file.buffer,ext:detectImage(file.buffer,file.mimetype)}));
 if(prepared.some(x=>!x.ext))return fail(res,'Only valid PNG, JPG and WebP images are supported.');
 const client=await pool.connect(),saved=[];let committed=false;
 try{
  await client.query('BEGIN');
  const product=(await client.query('SELECT id,image_url FROM products WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
  if(!product){await client.query('ROLLBACK');return fail(res,'Product not found.',404);}
  const count=await client.query('SELECT COUNT(*)::int AS n FROM product_images WHERE product_id=$1',[product.id]);
  if(count.rows[0].n+prepared.length>8){await client.query('ROLLBACK');return fail(res,'Gallery limited to 8 uploaded images.',409);}
  const rows=[];
  for(const [i,file] of prepared.entries()){
   const url=await saveImage(file.buffer,file.ext);saved.push(url);
   const inserted=await client.query('INSERT INTO product_images(product_id,image_url,position) VALUES($1,$2,$3) RETURNING *',[product.id,url,count.rows[0].n+i]);
   rows.push(inserted.rows[0]);
  }
  if(!product.image_url)await client.query('UPDATE products SET image_url=$1 WHERE id=$2',[rows[0].image_url,product.id]);
  await client.query('COMMIT');committed=true;
  res.status(201).json({images:rows});
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
 }finally{
  client.release();
  if(!committed)await Promise.all(saved.map(url=>removeImage(url).catch(()=>{})));
 }
}));
route.delete('/admin/products/:id/images/:imageId',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id)||!isId(req.params.imageId))return fail(res,'Invalid image ID.');
 const client=await pool.connect();let deleted=null;
 try{
  await client.query('BEGIN');
  const product=(await client.query('SELECT image_url FROM products WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
  if(!product){await client.query('ROLLBACK');return fail(res,'Product not found.',404);}
  const removed=await client.query('DELETE FROM product_images WHERE id=$1 AND product_id=$2 RETURNING *',[req.params.imageId,req.params.id]);
  if(!removed.rows[0]){await client.query('ROLLBACK');return fail(res,'Image not found.',404);}
  deleted=removed.rows[0].image_url;
  if(product.image_url===deleted){
   const next=await client.query('SELECT image_url FROM product_images WHERE product_id=$1 ORDER BY position,id LIMIT 1',[req.params.id]);
   await client.query('UPDATE products SET image_url=$1 WHERE id=$2',[next.rows[0]?.image_url||null,req.params.id]);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release();}
 await removeImage(deleted).catch(e=>console.error('Gallery cleanup failed:',e));
 res.json({ok:true});
}));

route.post('/admin/products/:id/image',authorize,admin,imageUpload,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'Invalid product id.');
 if(!req.file)return fail(res,'Choose a product photo.');
 const ext=detectImage(req.file.buffer,req.file.mimetype);
 if(!ext)return fail(res,'Ảnh tải lên không có dữ liệu JPG, PNG hoặc WebP hợp lệ. Hãy mở ảnh bằng Paint và chọn Save As → PNG/JPEG, sau đó thử lại.');
 const detectedType={png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[ext];
 if(req.file.mimetype!==detectedType)console.warn('Product image MIME mismatch; detected from bytes instead:',{declared:req.file.mimetype,detected:detectedType});
 const record=await query('SELECT image_url FROM products WHERE id=$1',[req.params.id]);
 if(!record.rows.length)return fail(res,'Product not found.',404);
 const url=await saveImage(req.file.buffer,ext);
 try{await query('UPDATE products SET image_url=$1 WHERE id=$2',[url,req.params.id]);}
 catch(err){await removeImage(url).catch(()=>{});throw err;}
 if(record.rows[0].image_url){
  const used=await query('SELECT 1 FROM product_images WHERE image_url=$1 LIMIT 1',[record.rows[0].image_url]);
  if(!used.rowCount)await removeImage(record.rows[0].image_url).catch(err=>console.error('Image cleanup failed',err));
 }
 res.status(201).json({image_url:url});
}));
route.delete('/admin/products/:id/image',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id))return fail(res,'Invalid product id.');
 const record=await query('SELECT image_url FROM products WHERE id=$1',[req.params.id]);
 if(!record.rows.length)return fail(res,'Product not found.',404);
 const next=await query('SELECT image_url FROM product_images WHERE product_id=$1 ORDER BY position,id LIMIT 1',[req.params.id]);
 const cover=next.rows[0]?.image_url||null;
 await query('UPDATE products SET image_url=$1 WHERE id=$2',[cover,req.params.id]);
 const used=record.rows[0].image_url&&await query('SELECT 1 FROM product_images WHERE image_url=$1 LIMIT 1',[record.rows[0].image_url]);
 if(record.rows[0].image_url&&!used?.rowCount)await removeImage(record.rows[0].image_url).catch(err=>console.error('Image cleanup failed',err));
 res.json({image_url:cover});
}));

route.post('/products/:id/variants',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id)||!clean(req.body.sku)||!clean(req.body.size)||!Number.isSafeInteger(Number(req.body.stock))||Number(req.body.stock)<0)return fail(res,'Thông tin biến thể không hợp lệ.');
 const rawChest=req.body.chest_cm;
 const hasChest=rawChest!==undefined&&rawChest!==null&&rawChest!=='';
 if(hasChest&&(!Number.isSafeInteger(Number(rawChest))||Number(rawChest)<=0))return fail(res,'Vòng ngực phải là số nguyên dương.');
 try {const r=await query(`INSERT INTO product_variants(product_id,sku,size,color,chest_cm,stock) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[
 req.params.id,clean(req.body.sku),clean(req.body.size),clean(req.body.color)||'Onyx',hasChest?Number(rawChest):null,Number(req.body.stock)]);res.status(201).json(r.rows[0]);}
 catch(e){if(e.code==='23505')return fail(res,'Biến thể hoặc SKU đã tồn tại.',409);if(e.code==='23503')return fail(res,'Sản phẩm không tồn tại.',404);throw e;}
}));
route.patch('/variants/:id',authorize,admin,wrap(async(req,res)=>{
 if(!isId(req.params.id)||!Number.isSafeInteger(Number(req.body.stock))||Number(req.body.stock)<0)return fail(res,'Số tồn kho không hợp lệ.');
 const r=await query('UPDATE product_variants SET stock=$1 WHERE id=$2 RETURNING *',[Number(req.body.stock),req.params.id]);
 if(!r.rows[0])return fail(res,'Biến thể không tồn tại.',404);res.json(r.rows[0]);
}));

route.post('/orders',authorize,wrap(async(req,res)=>{
 const {recipient,phone,address,items}=req.body;
 if(clean(recipient).length<2||clean(phone).length<9||clean(address).length<10||!Array.isArray(items)||items.length===0||items.length>30)return fail(res,'Thông tin nhận hàng hoặc giỏ hàng không hợp lệ.');
 const ids=new Set();for(const item of items){if(!isId(item.variant_id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20||ids.has(Number(item.variant_id)))return fail(res,'Biến thể hoặc số lượng không hợp lệ.');ids.add(Number(item.variant_id));}
 const client=await pool.connect();
 try{
  await client.query('BEGIN');let total=0;const lines=[];
  // Row locks held for the entire transaction; sorted order reduces deadlock risk.
  const sorted=[...items].sort((a,b)=>a.variant_id-b.variant_id);
  for(const item of sorted){
   const r=await client.query(`SELECT v.*,p.name AS product_name,COALESCE(p.sale_price,p.price) AS price,p.status FROM product_variants v
       JOIN products p ON p.id=v.product_id WHERE v.id=$1 FOR UPDATE OF v`,[item.variant_id]);
   const v=r.rows[0];if(!v||v.status!=='active'||v.stock<item.quantity) {const err=new Error('Hết hàng hoặc số lượng không đủ.');err.status=409;throw err;}
   total+=v.price*item.quantity;lines.push({variant:v,quantity:item.quantity});
  }
  if(!Number.isSafeInteger(total)){const e=new Error('Giá trị đơn hàng không hợp lệ.');e.status=400;throw e;}
  const o=await client.query(`INSERT INTO orders(user_id,recipient,phone,address,total) VALUES($1,$2,$3,$4,$5) RETURNING *`,[req.user.id,clean(recipient),clean(phone),clean(address),total]);
  for(const {variant:v,quantity} of lines){
   await client.query('UPDATE product_variants SET stock=stock-$1 WHERE id=$2',[quantity,v.id]);
   await client.query(`INSERT INTO order_items(order_id,variant_id,product_name,sku,size,quantity,unit_price) VALUES($1,$2,$3,$4,$5,$6,$7)`,[o.rows[0].id,v.id,v.product_name,v.sku,v.size,quantity,v.price]);
  }
  await client.query('COMMIT');res.status(201).json(o.rows[0]);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
route.get('/orders/mine',authorize,wrap(async(req,res)=>{
 const r=await query(`SELECT o.*,COALESCE((SELECT json_agg(json_build_object('product_name',i.product_name,'sku',i.sku,'quantity',i.quantity,'unit_price',i.unit_price,'size',i.size)) FROM order_items i WHERE i.order_id=o.id),'[]'::json) AS items FROM orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC`,[req.user.id]);res.json(r.rows);
}));
route.get('/admin/orders',authorize,admin,wrap(async(req,res)=>{
 const r=await query(`SELECT o.*,u.email,COALESCE((SELECT json_agg(json_build_object('product_name',i.product_name,'sku',i.sku,'quantity',i.quantity,'unit_price',i.unit_price,'size',i.size)) FROM order_items i WHERE i.order_id=o.id),'[]'::json) AS items FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 100`);res.json(r.rows);
}));
route.patch('/admin/orders/:id/status',authorize,admin,wrap(async(req,res)=>{
 const next=req.body.status;if(!['CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].includes(next)||!isId(req.params.id))return fail(res,'Trạng thái không hợp lệ.');
 const allowed={PENDING:['CONFIRMED','CANCELLED'],CONFIRMED:['SHIPPED','CANCELLED'],SHIPPED:['DELIVERED'],DELIVERED:[],CANCELLED:[]};
 const c=await pool.connect();try{
 await c.query('BEGIN');const result=await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[req.params.id]);const o=result.rows[0];
 if(!o){const e=new Error('Không tìm thấy đơn.');e.status=404;throw e;}
 if(!allowed[o.status].includes(next)){const e=new Error('Chuyển trạng thái không hợp lệ.');e.status=409;throw e;}
 if(next==='CANCELLED'){
  const lines=await c.query('SELECT variant_id,quantity FROM order_items WHERE order_id=$1',[o.id]);
  for(const line of lines.rows) await c.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2',[line.quantity,line.variant_id]);
 }
 const r=await c.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',[next,o.id]);await c.query('COMMIT');res.json(r.rows[0]);
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}));

app.use((req,res)=>fail(res,'API endpoint không tồn tại.',404));
app.use((err,req,res,next)=>{console.error(err);return res.status(err.status||500).json({error:err.status?err.message:'Lỗi máy chủ. Vui lòng thử lại.'});});
app.listen(PORT,()=>console.log(`KD API http://localhost:${PORT}/api/health`));
