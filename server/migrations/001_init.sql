-- ============================================================
--  The Twins Coffee® — Database Schema + Seed Data
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. Products ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  category    TEXT NOT NULL DEFAULT 'coffee',
  description TEXT,
  badge       TEXT,
  has_type    BOOLEAN DEFAULT false,
  has_roast   BOOLEAN DEFAULT false,
  featured    BOOLEAN DEFAULT false,
  active      BOOLEAN DEFAULT true,
  images      TEXT[]   DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Product Sizes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_sizes (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  stock      INT DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- ─── 3. Orders ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  city             TEXT DEFAULT '',
  items            JSONB NOT NULL DEFAULT '[]',
  shipping_id      BIGINT,
  shipping_name    TEXT DEFAULT '',
  shipping_price   NUMERIC(10,2) DEFAULT 0,
  subtotal         NUMERIC(10,2) NOT NULL,
  total            NUMERIC(10,2) NOT NULL,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. Shipping Options ────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_options (
  id      BIGSERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  name_ar TEXT,
  price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  days    TEXT,
  active  BOOLEAN DEFAULT true
);

-- ─── 5. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sizes_product     ON product_sizes(product_id);

-- ─── 6. RLS (Row Level Security) ────────────────────────────
-- Products: anyone can read, only authenticated users can write
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_options ENABLE ROW LEVEL SECURITY;

-- Products: public read
CREATE POLICY "Public can read active products"
  ON products FOR SELECT USING (active = true);

CREATE POLICY "Admin full access on products"
  ON products FOR ALL USING (auth.role() = 'authenticated');

-- Product sizes: public read
CREATE POLICY "Public can read product sizes"
  ON product_sizes FOR SELECT USING (true);

CREATE POLICY "Admin full access on product_sizes"
  ON product_sizes FOR ALL USING (auth.role() = 'authenticated');

-- Orders: anyone can insert, only admin can read/update/delete
CREATE POLICY "Anyone can place an order"
  ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can read all orders"
  ON orders FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can update orders"
  ON orders FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete orders"
  ON orders FOR DELETE USING (auth.role() = 'authenticated');

-- Shipping: public read
CREATE POLICY "Public can read active shipping"
  ON shipping_options FOR SELECT USING (active = true);

CREATE POLICY "Admin full access on shipping"
  ON shipping_options FOR ALL USING (auth.role() = 'authenticated');

-- ─── 7. Helper Function: Decrement Stock ────────────────────
CREATE OR REPLACE FUNCTION decrement_stock(p_size_id BIGINT, p_qty INT)
RETURNS void AS $$
BEGIN
  UPDATE product_sizes
  SET stock = GREATEST(0, stock - p_qty)
  WHERE id = p_size_id;
END;
$$ LANGUAGE plpgsql;

-- ─── 8. Seed: Shipping Options ──────────────────────────────
INSERT INTO shipping_options (name, name_ar, price, days, active) VALUES
  ('Standard Delivery', 'توصيل عادي',      50,  '3-5 أيام',    true),
  ('Express Delivery',  'توصيل سريع',      120, '1-2 يوم',     true),
  ('Same Day',          'توصيل نفس اليوم', 200, 'اليوم نفسه',  false)
ON CONFLICT DO NOTHING;

-- ─── 9. Seed: Products ──────────────────────────────────────
-- Turkish Coffee (House Blend)
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Turkish Coffee', 'قهوة تركية', 'coffee',
        'Premium 100% Arabica Turkish Coffee. House blend, finely ground and freshly sealed for maximum freshness and rich flavor.',
        'House Blend', true, true, true, true,
        ARRAY['item1.jpeg', 'item2.jpeg', 'item3.jpeg', 'item4.jpeg'])
RETURNING id;

-- Travel Tumbler
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Travel Tumbler', 'تمبلر', 'merch',
        'Premium matte black stainless steel travel tumbler. Double-wall vacuum insulated — keeps your coffee hot for hours.',
        'Merchandise', false, false, true, true,
        ARRAY['item2.jpeg'])
RETURNING id;

-- Travel Cup
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Travel Cup', 'كوب سفر', 'merch',
        'Compact matte black stainless steel travel cup with the iconic T logo.',
        'Merchandise', false, false, false, true,
        ARRAY['item3.jpeg'])
RETURNING id;

-- Dark Roast
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Dark Roast', 'غامق — خلطة خاصة', 'coffee',
        'Rich and bold dark roast coffee, deeply roasted for an intense flavor profile.',
        'Dark Roast', true, true, true, true,
        ARRAY['item1.jpeg'])
RETURNING id;

-- Medium Roast
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Medium Roast', 'وسط — توازن مثالي', 'coffee',
        'Perfectly balanced medium roast with a smooth, well-rounded flavor and pleasant aroma.',
        'Medium Roast', true, true, true, true,
        ARRAY['item2.jpeg'])
RETURNING id;

-- Cardamom Blend
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Cardamom Blend', 'محوج — بالهيل الطبيعي', 'coffee',
        'Authentic Turkish coffee with freshly ground cardamom. A timeless classic blend.',
        'محوج', true, true, false, true,
        ARRAY['item3.jpeg'])
RETURNING id;

-- Plain Blend
INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images)
VALUES ('Plain Blend', 'ساده — قهوة صافية', 'coffee',
        'Pure Turkish coffee with no additives. Clean, natural flavor.',
        'ساده', true, true, false, true,
        ARRAY['item4.jpeg'])
RETURNING id;

-- ─── 10. Seed: Product Sizes ────────────────────────────────
-- NOTE: Run after the products inserts above.
-- We use subqueries to find the product IDs by name.

-- Turkish Coffee sizes
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '200g', 180, 50, 0 FROM products WHERE name = 'Turkish Coffee';
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '500g', 380, 30, 1 FROM products WHERE name = 'Turkish Coffee';
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '1kg',  700, 20, 2 FROM products WHERE name = 'Turkish Coffee';

-- Travel Tumbler
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, 'Large', 600, 20, 0 FROM products WHERE name = 'Travel Tumbler';

-- Travel Cup
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, 'Compact', 480, 15, 0 FROM products WHERE name = 'Travel Cup';

-- Dark Roast
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '200g', 200, 40, 0 FROM products WHERE name = 'Dark Roast';
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '500g', 420, 25, 1 FROM products WHERE name = 'Dark Roast';

-- Medium Roast
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '200g', 190, 60, 0 FROM products WHERE name = 'Medium Roast';
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '500g', 400, 35, 1 FROM products WHERE name = 'Medium Roast';

-- Cardamom Blend
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '200g', 210, 45, 0 FROM products WHERE name = 'Cardamom Blend';
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '500g', 450, 20, 1 FROM products WHERE name = 'Cardamom Blend';

-- Plain Blend
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '200g', 175, 55, 0 FROM products WHERE name = 'Plain Blend';
INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
SELECT id, '500g', 360, 30, 1 FROM products WHERE name = 'Plain Blend';

-- ─── Done! ───────────────────────────────────────────────────
-- SELECT * FROM products;
-- SELECT * FROM product_sizes;
-- SELECT * FROM shipping_options;
