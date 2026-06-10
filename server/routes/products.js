// ============================================================
//  The Twins Coffee® — Products Routes (SQLite async)
// ============================================================
const express  = require('express');
const router   = express.Router();
const { getDb, normalizeProduct } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── Helper: get product + sizes by id ───────────────────────
async function getFullProduct(db, id) {
  const p     = await db.get('SELECT * FROM products WHERE id = ?', [id]);
  if (!p) return null;
  const sizes = await db.all('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY sort_order', [id]);
  return normalizeProduct(p, sizes);
}

// ─── Helper: get all products ────────────────────────────────
async function getAllProducts(db, onlyActive = false) {
  const sql  = onlyActive
    ? 'SELECT * FROM products WHERE active=1 ORDER BY created_at DESC'
    : 'SELECT * FROM products ORDER BY created_at DESC';
  const rows = await db.all(sql);
  const results = [];
  for (const p of rows) {
    const sizes = await db.all('SELECT * FROM product_sizes WHERE product_id=? ORDER BY sort_order', [p.id]);
    results.push(normalizeProduct(p, sizes));
  }
  return results;
}

// ─── GET /api/products — public ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    res.json(await getAllProducts(db, true));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/products/all — admin ───────────────────────────
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    res.json(await getAllProducts(db, false));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/products/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const p  = await getFullProduct(db, +req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(p);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/products — admin ───────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, category, description, badge, hasType, hasRoast,
            featured, active, images, variantImages, colors, sizes } = req.body;
    if (!name || !sizes || !sizes.length) {
      return res.status(400).json({ error: 'name and sizes required' });
    }

    const db = getDb();
    await db.run('BEGIN');
    try {
      const result = await db.run(
        `INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images, variant_images, colors)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name, nameAr||'', category||'coffee', description||'', badge||'',
         hasType?1:0, hasRoast?1:0, featured?1:0, active!==false?1:0,
         JSON.stringify(images||[]), JSON.stringify(variantImages||{}), JSON.stringify(colors||[])]
      );
      const pid = result.lastID;
      for (let i = 0; i < sizes.length; i++) {
        const sz = sizes[i];
        await db.run(
          'INSERT INTO product_sizes (product_id, label, price, stock, sort_order) VALUES (?,?,?,?,?)',
          [pid, sz.label, sz.price, sz.stock||0, i]
        );
      }
      await db.run('COMMIT');
      res.status(201).json(await getFullProduct(db, pid));
    } catch(e) {
      await db.run('ROLLBACK');
      throw e;
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/products/:id — admin ───────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, category, description, badge, hasType, hasRoast,
            featured, active, images, variantImages, colors, sizes } = req.body;
    const id = +req.params.id;
    const db = getDb();

    await db.run('BEGIN');
    try {
      await db.run(
        `UPDATE products SET name=?, name_ar=?, category=?, description=?, badge=?,
         has_type=?, has_roast=?, featured=?, active=?, images=?, variant_images=?, colors=?, updated_at=datetime('now')
         WHERE id=?`,
        [name, nameAr||'', category||'coffee', description||'', badge||'',
         hasType?1:0, hasRoast?1:0, featured?1:0, active!==false?1:0,
         JSON.stringify(images||[]), JSON.stringify(variantImages||{}), JSON.stringify(colors||[]), id]
      );
      await db.run('DELETE FROM product_sizes WHERE product_id=?', [id]);
      if (sizes && sizes.length) {
        for (let i = 0; i < sizes.length; i++) {
          const sz = sizes[i];
          await db.run(
            'INSERT INTO product_sizes (product_id, label, price, stock, sort_order) VALUES (?,?,?,?,?)',
            [id, sz.label, sz.price, sz.stock||0, i]
          );
        }
      }
      await db.run('COMMIT');
      res.json(await getFullProduct(db, id));
    } catch(e) {
      await db.run('ROLLBACK');
      throw e;
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/products/:id/toggle — admin ──────────────────
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = +req.params.id;
    const p  = await db.get('SELECT active FROM products WHERE id=?', [id]);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const newActive = p.active ? 0 : 1;
    await db.run("UPDATE products SET active=?, updated_at=datetime('now') WHERE id=?", [newActive, id]);
    res.json({ active: !!newActive });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/products/:id/stock — admin ───────────────────
router.patch('/:id/stock', requireAdmin, async (req, res) => {
  try {
    const { sizeId, stock } = req.body;
    if (sizeId === undefined || stock === undefined) {
      return res.status(400).json({ error: 'sizeId and stock required' });
    }
    const db       = getDb();
    const newStock = Math.max(0, parseInt(stock));
    await db.run('UPDATE product_sizes SET stock=? WHERE id=? AND product_id=?',
      [newStock, sizeId, +req.params.id]);
    res.json({ success: true, stock: newStock });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/products/:id — admin ────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM products WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
