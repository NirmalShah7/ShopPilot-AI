CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  price INTEGER NOT NULL,
  mrp INTEGER NOT NULL,
  rating REAL NOT NULL,
  review_count INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  specs_json TEXT NOT NULL,
  tags_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
