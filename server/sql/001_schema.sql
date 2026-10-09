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
