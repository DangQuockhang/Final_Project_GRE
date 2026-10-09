import {pool} from './db.js';
import bcrypt from 'bcryptjs';

const brands = [
 ['ATELIER NORTH','atelier-north','Nhãn giả lập — essentials và relaxed silhouettes.'],
 ['MONO OBJECT','mono-object','Nhãn giả lập — phụ kiện tối giản.'],
 ['FORM / STUDIO','form-studio','Nhãn giả lập — contemporary clothing.']
];
const products = [
 ['essential-sculpt-tee','Essential Sculpt Tee','atelier-north','tops',1450000,'Áo thun form relaxed để minh họa hệ thống fitting 3D.','#535c52',true,['S','M','L','XL']],
 ['structured-overshirt','Structured Overshirt','form-studio','outerwear',2750000,'Overshirt contemporary với đường nét tối giản.','#b6a994',true,['S','M','L','XL']],
 ['modern-knit-polo','Modern Knit Polo','atelier-north','tops',1950000,'Polo dệt kim trong bộ sưu tập demo.','#d4c1a1',true,['S','M','L','XL']],
 ['wide-leg-trousers','Wide Leg Trousers','form-studio','bottoms',2350000,'Quần suông thanh lịch.','#444b4a',false,['S','M','L','XL']],
 ['urban-crossbody','Urban Crossbody','mono-object','accessories',1690000,'Túi đeo chéo gọn nhẹ.','#343b40',false,['ONE SIZE']],
 ['everyday-cap','Everyday Cap','mono-object','accessories',950000,'Mũ lưỡi trai tối giản.','#9d9587',false,['ONE SIZE']]
];
try {
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    for(const [name,slug,description] of brands) await c.query(
      'INSERT INTO brands(name,slug,description) VALUES($1,$2,$3) ON CONFLICT(slug) DO NOTHING',[name,slug,description]);
    for(const [slug,name,brand,category,price,description,color,tryon,sizes] of products) {
      const p=await c.query(`INSERT INTO products(name,slug,brand_id,category,price,description,color,tryon_enabled)
        SELECT $1,$2,b.id,$4,$5,$6,$7,$8 FROM brands b WHERE b.slug=$3 ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [name,slug,brand,category,price,description,color,tryon]);
      const chests={S:98,M:106,L:114,XL:122};
      for(const [i,size] of sizes.entries()) await c.query(`INSERT INTO product_variants(product_id,sku,size,color,chest_cm,stock)
        VALUES($1,$2,$3,'Onyx',$4,$5) ON CONFLICT(sku) DO NOTHING`,
        [p.rows[0].id,`KD-${slug.toUpperCase()}-${size.replace(/ /g,'_')}`,size,chests[size]||null,8+i*2]);
    }
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD phải từ 12 ký tự trở lên.');
      const hash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);
      await c.query(`INSERT INTO users(name,email,password_hash,role) VALUES('KD Admin',$1,$2,'admin')
        ON CONFLICT(email) DO NOTHING`,[process.env.ADMIN_EMAIL.toLowerCase(),hash]);
      console.log('Admin seed checked:',process.env.ADMIN_EMAIL);
    } else console.log('Chưa seed admin: đặt ADMIN_EMAIL và ADMIN_PASSWORD trong server/.env');
    await c.query('COMMIT'); console.log('Demo brands/products seeded (fictional).');
  } catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();}
} catch(e){console.error(e);process.exitCode=1;} finally{await pool.end();}
