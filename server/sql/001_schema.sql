CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  color VARCHAR(24) NOT NULL DEFAULT '#7b807a',
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  tryon_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  size VARCHAR(20) NOT NULL,
  color VARCHAR(40) NOT NULL DEFAULT 'Onyx',
  chest_cm INTEGER,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  UNIQUE (product_id,size,color)
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recipient VARCHAR(120) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  address TEXT NOT NULL,
  payment_method VARCHAR(10) NOT NULL DEFAULT 'COD' CHECK (payment_method='COD'),
  status VARCHAR(15) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')),
  total INTEGER NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  product_name VARCHAR(160) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  size VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand_id);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- Safe additive schema upgrade for existing KD Design databases.
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Additive, idempotent audit log; product_id is deliberately not a foreign key.
CREATE TABLE IF NOT EXISTS product_deletion_audit (
 id BIGSERIAL PRIMARY KEY,
 product_id INTEGER NOT NULL,
 product_name VARCHAR(160) NOT NULL,
 product_slug VARCHAR(180) NOT NULL,
 deleted_by INTEGER NOT NULL REFERENCES users(id),
 deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 snapshot JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS product_deletion_audit_actor_idx ON product_deletion_audit(deleted_by);


-- Experimental retail features; additive and safe to run repeatedly.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(60);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sale_price_guard;
ALTER TABLE products ADD CONSTRAINT products_sale_price_guard CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price));
CREATE TABLE IF NOT EXISTS product_images(
 id BIGSERIAL PRIMARY KEY,
 product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 image_url TEXT NOT NULL UNIQUE,
 position INTEGER NOT NULL DEFAULT 0 CHECK(position>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_images_product_position_idx ON product_images(product_id,position,id);

-- Fill product-type filters only for known fictional seed items, without
-- changing any existing Admin-entered product types.
UPDATE products SET product_type = CASE slug
 WHEN 'essential-sculpt-tee' THEN 'T-Shirt'
 WHEN 'structured-overshirt' THEN 'Jacket'
 WHEN 'modern-knit-polo' THEN 'Polo'
 WHEN 'wide-leg-trousers' THEN 'Pants'
 WHEN 'urban-crossbody' THEN 'Crossbody'
 WHEN 'everyday-cap' THEN 'Cap'
 ELSE product_type END
 WHERE product_type IS NULL AND slug IN
 ('essential-sculpt-tee','structured-overshirt','modern-knit-polo','wide-leg-trousers','urban-crossbody','everyday-cap');


-- Sprint 2.9: Consolidated storefront collections without deleting existing products.
-- Preserve historical type in product_type and map bag-like accessories into Bags.
UPDATE products SET category='bags'
 WHERE category='accessories' AND (LOWER(COALESCE(product_type,'')) ~ '(bag|tote|clutch|backpack|crossbody)' OR slug ~ '(bag|tote|crossbody|backpack|clutch)');
UPDATE products SET category='clothing' WHERE category IN ('tops','bottoms','outerwear');
UPDATE products SET category='shoes' WHERE category='footwear';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7);


-- Sprint 2.14 — public order references, item photo snapshots and payment tracking.
-- Existing order IDs and all order history remain intact.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code VARCHAR(32);
UPDATE orders SET order_code='KD-'||
 to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYYMMDD')||'-'||
 upper(lpad(to_hex(id),12,'0'))
WHERE order_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_code_unique_idx ON orders(order_code);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(24) NOT NULL DEFAULT 'UNPAID';
ALTER TABLE orders ALTER COLUMN payment_method TYPE VARCHAR(20);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('COD','BANK_TRANSFER'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK(payment_status IN ('UNPAID','AWAITING_TRANSFER','PAID','REFUND_PENDING'));

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_slug TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT;
UPDATE order_items i SET
 image_url=COALESCE(i.image_url,p.image_url),
 product_slug=COALESCE(i.product_slug,p.slug),
 brand_name=COALESCE(i.brand_name,b.name),
 color=COALESCE(i.color,v.color)
FROM product_variants v JOIN products p ON p.id=v.product_id JOIN brands b ON b.id=p.brand_id
WHERE i.variant_id=v.id AND (i.image_url IS NULL OR i.product_slug IS NULL OR i.brand_name IS NULL OR i.color IS NULL);


-- Sprint 2.19: Size charts are NOT product photographs. Per-product override
-- wins over the brand/category default. All changes are additive/idempotent.
CREATE TABLE IF NOT EXISTS brand_size_guides (
 brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
 category VARCHAR(40) NOT NULL CHECK (category IN ('clothing','shoes','bags','accessories')),
 image_url TEXT NOT NULL,
 PRIMARY KEY (brand_id,category)
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_guide_image_url TEXT;


-- Product types drive persistent collections. Normalize old and new names alike.
CREATE OR REPLACE FUNCTION normalize_collection_name(value TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
 SELECT upper(left(n,1)) || substring(n FROM 2)
 FROM (SELECT lower(trim(regexp_replace(COALESCE(value,''),'[[:space:]]+',' ','g'))) AS n) normalized;
$$;
CREATE TABLE IF NOT EXISTS collections (
 id SERIAL PRIMARY KEY,
 category VARCHAR(40) NOT NULL CHECK (category IN ('accessories','bags','clothing','shoes')),
 name VARCHAR(60) NOT NULL CHECK (name<>'' AND name=normalize_collection_name(name)),
 hidden BOOLEAN NOT NULL DEFAULT false,
 UNIQUE(category,name)
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES collections(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS products_collection_idx ON products(collection_id);
CREATE OR REPLACE FUNCTION sync_product_collection() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 NEW.product_type := NULLIF(normalize_collection_name(NEW.product_type),'');
 IF NEW.product_type IS NULL THEN
  NEW.collection_id := NULL;
 ELSE
  INSERT INTO collections(category,name) VALUES(NEW.category,NEW.product_type)
   ON CONFLICT(category,name) DO UPDATE SET name=EXCLUDED.name
   RETURNING id INTO NEW.collection_id;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS products_collection_sync ON products;
CREATE TRIGGER products_collection_sync BEFORE INSERT OR UPDATE OF product_type,category,collection_id
 ON products FOR EACH ROW EXECUTE FUNCTION sync_product_collection();
-- Backfill safely on existing databases; hidden flags remain unchanged on reruns.
UPDATE products SET product_type=product_type;
