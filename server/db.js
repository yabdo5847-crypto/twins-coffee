// ============================================================
//  The Twins Coffee® — SQLite Database Layer
//  Uses better-sqlite3: synchronous, fast, zero config.
//  The DB file is stored at: server/data/twins_coffee.db
// ============================================================
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'twins_coffee.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    name_ar     TEXT,
    category    TEXT NOT NULL DEFAULT 'coffee',
    description TEXT,
    badge       TEXT,
    has_type    INTEGER DEFAULT 0,
    has_roast   INTEGER DEFAULT 0,
    featured    INTEGER DEFAULT 0,
    active      INTEGER DEFAULT 1,
    images      TEXT DEFAULT '[]',
    colors      TEXT DEFAULT '[]',
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_sizes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label      TEXT NOT NULL,
    price      REAL NOT NULL,
    stock      INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               TEXT PRIMARY KEY,
    customer_name    TEXT NOT NULL,
    customer_phone   TEXT DEFAULT '',
    customer_address TEXT DEFAULT '',
    city             TEXT DEFAULT '',
    items            TEXT DEFAULT '[]',
    shipping_id      INTEGER,
    shipping_name    TEXT DEFAULT '',
    shipping_price   REAL DEFAULT 0,
    subtotal         REAL NOT NULL,
    total            REAL NOT NULL,
    status           TEXT DEFAULT 'pending',
    notes            TEXT DEFAULT '',
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shipping_options (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    name_ar TEXT,
    price   REAL NOT NULL DEFAULT 0,
    days    TEXT,
    active  INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    name_ar     TEXT,
    slug        TEXT UNIQUE NOT NULL,
    active      INTEGER DEFAULT 1
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active);
  CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
  CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_sizes_product     ON product_sizes(product_id);
`);

// ─── Seed default data (only if tables are empty) ──────────
const productCount = db.prepare('SELECT COUNT(*) as n FROM products').get().n;
if (productCount === 0) {
  console.log('🌱 Seeding database with default products...');

  const insertProduct = db.prepare(`
    INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images, colors)
    VALUES (@name, @nameAr, @category, @description, @badge, @hasType, @hasRoast, @featured, @active, @images, @colors)
  `);
  const insertSize = db.prepare(`
    INSERT INTO product_sizes (product_id, label, price, stock, sort_order)
    VALUES (@productId, @label, @price, @stock, @sortOrder)
  `);

  const seedProducts = [
    { name:'Cardamom Coffee', nameAr:'قهوة تركية محوجة', category:'coffee',
      description:'Premium 100% Arabica Turkish Coffee blended with natural ground cardamom. Rich, aromatic, and crafted for a perfect cup with thick traditional foam.',
      badge:'Best Seller', hasType:0, hasRoast:1, featured:1, active:1,
      images: JSON.stringify(['uploads/Transform_this_product_into_a_202605300538 (3).jpeg', 'uploads/Transform_this_product_into_a_202605300538 (2).jpeg']),
      colors: JSON.stringify([]),
      sizes: [{ label:'200g', price:180, stock:50 },{ label:'500g', price:380, stock:30 },{ label:'1kg', price:700, stock:20 }] },
    { name:'Plain Coffee', nameAr:'قهوة تركية ساده', category:'coffee',
      description:'Pure 100% Arabica Turkish Coffee with no additives. A clean, smooth, and balanced flavor that highlights the true essence of premium coffee beans.',
      badge:'Classic', hasType:0, hasRoast:1, featured:1, active:1,
      images: JSON.stringify(['uploads/Transform_this_product_into_a_202605300538 (5).jpeg', 'uploads/Transform_this_product_into_a_202605300538 (4).jpeg']),
      colors: JSON.stringify([]),
      sizes: [{ label:'200g', price:170, stock:60 },{ label:'500g', price:350, stock:40 },{ label:'1kg', price:650, stock:25 }] },
    { name:'Premium Travel Cup', nameAr:'كوب سفر فاخر', category:'merch',
      description:'Premium matte black stainless steel travel cup. Double-wall vacuum insulated to keep your Turkish coffee hot for hours. Available in two designs.',
      badge:'Merch', hasType:0, hasRoast:0, featured:1, active:1,
      images: JSON.stringify(['uploads/Transform_this_product_into_a_202605300538.jpeg', 'uploads/Transform_this_product_into_a_202605300538 (1).jpeg']),
      colors: JSON.stringify([{ hex: '#1a1a1a', name: 'T Logo / شعار' }, { hex: '#2c2c2c', name: 'Signature / توقيع' }]),
      sizes: [{ label:'Compact', price:450, stock:35 }] },
  ];

  const seedAll = db.transaction(() => {
    seedProducts.forEach(p => {
      const { sizes, ...productData } = p;
      const result = insertProduct.run(productData);
      sizes.forEach((sz, i) => insertSize.run({
        productId: result.lastInsertRowid, label: sz.label,
        price: sz.price, stock: sz.stock, sortOrder: i
      }));
    });
  });
  seedAll();
}

const shippingCount = db.prepare('SELECT COUNT(*) as n FROM shipping_options').get().n;
if (shippingCount === 0) {
  const insertShip = db.prepare(
    'INSERT INTO shipping_options (name, name_ar, price, days, active) VALUES (?,?,?,?,?)'
  );
  insertShip.run('Standard Delivery', 'توصيل عادي',      50,  '3-5 أيام',    1);
  insertShip.run('Express Delivery',  'توصيل سريع',      120, '1-2 يوم',     1);
  insertShip.run('Same Day',          'توصيل نفس اليوم', 200, 'اليوم نفسه',  0);
}

// ─── Helper: row normalizers ──────────────────────────────────
function normalizeProduct(p, sizes = []) {
  return {
    id:          p.id,
    name:        p.name,
    nameAr:      p.name_ar,
    category:    p.category,
    description: p.description,
    badge:       p.badge,
    hasType:     !!p.has_type,
    hasRoast:    !!p.has_roast,
    featured:    !!p.featured,
    active:      !!p.active,
    images:      JSON.parse(p.images || '[]'),
    colors:      JSON.parse(p.colors || '[]'),
    sizes:       sizes.map(s => ({ id: s.id, label: s.label, price: s.price, stock: s.stock })),
    createdAt:   p.created_at,
  };
}

function normalizeOrder(o) {
  return {
    id:           o.id,
    customer: {
      name:    o.customer_name,
      phone:   o.customer_phone,
      address: o.customer_address,
      city:    o.city,
    },
    items:        JSON.parse(o.items || '[]'),
    shippingId:   o.shipping_id,
    shippingName: o.shipping_name,
    shippingPrice: o.shipping_price,
    subtotal:     o.subtotal,
    total:        o.total,
    status:       o.status,
    notes:        o.notes,
    date:         new Date(o.created_at).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' }),
    createdAt:    o.created_at,
  };
}

function normalizeShipping(s) {
  return { id: s.id, name: s.name, nameAr: s.name_ar, price: s.price, days: s.days, active: !!s.active };
}

module.exports = { db, normalizeProduct, normalizeOrder, normalizeShipping };
