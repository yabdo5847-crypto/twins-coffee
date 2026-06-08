// ============================================================
//  The Twins Coffee® — Products Routes (SQLite)
// ============================================================
const express  = require('express');
const router   = express.Router();
const { db, normalizeProduct } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── Helper: get product + sizes by id ───────────────────────
function getFullProduct(id) {
  const p     = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!p) return null;
  const sizes = db.prepare('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY sort_order').all(id);
  return normalizeProduct(p, sizes);
}

// ─── Helper: get all products ────────────────────────────────
function getAllProducts(onlyActive = false) {
  const rows = onlyActive
    ? db.prepare('SELECT * FROM products WHERE active=1 ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  return rows.map(p => {
    const sizes = db.prepare('SELECT * FROM product_sizes WHERE product_id=? ORDER BY sort_order').all(p.id);
    return normalizeProduct(p, sizes);
  });
}

// ─── GET /api/products — public ──────────────────────────────
router.get('/', (req, res) => {
  try { res.json(getAllProducts(true)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/products/all — admin ───────────────────────────
router.get('/all', requireAdmin, (req, res) => {
  try { res.json(getAllProducts(false)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/products/:id ────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const p = getFullProduct(+req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(p);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/products — admin ───────────────────────────────
router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, nameAr, category, description, badge, hasType, hasRoast,
            featured, active, images, colors, sizes } = req.body;
    if (!name || !sizes || !sizes.length) {
      return res.status(400).json({ error: 'name and sizes required' });
    }

    const insert = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO products (name, name_ar, category, description, badge, has_type, has_roast, featured, active, images, colors)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(name, nameAr||'', category||'coffee', description||'', badge||'',
             hasType?1:0, hasRoast?1:0, featured?1:0, active!==false?1:0,
             JSON.stringify(images||[]), JSON.stringify(colors||[]));

      const pid = result.lastInsertRowid;
      sizes.forEach((sz, i) => {
        db.prepare('INSERT INTO product_sizes (product_id, label, price, stock, sort_order) VALUES (?,?,?,?,?)')
          .run(pid, sz.label, sz.price, sz.stock||0, i);
      });
      return pid;
    });

    const pid = insert();
    res.status(201).json(getFullProduct(pid));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/products/:id — admin ───────────────────────────
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { name, nameAr, category, description, badge, hasType, hasRoast,
            featured, active, images, colors, sizes } = req.body;
    const id = +req.params.id;

    const update = db.transaction(() => {
      db.prepare(`
        UPDATE products SET name=?, name_ar=?, category=?, description=?, badge=?,
        has_type=?, has_roast=?, featured=?, active=?, images=?, colors=?, updated_at=datetime('now')
        WHERE id=?
      `).run(name, nameAr||'', category||'coffee', description||'', badge||'',
             hasType?1:0, hasRoast?1:0, featured?1:0, active!==false?1:0,
             JSON.stringify(images||[]), JSON.stringify(colors||[]), id);

      db.prepare('DELETE FROM product_sizes WHERE product_id=?').run(id);
      if (sizes && sizes.length) {
        sizes.forEach((sz, i) => {
          db.prepare('INSERT INTO product_sizes (product_id, label, price, stock, sort_order) VALUES (?,?,?,?,?)')
            .run(id, sz.label, sz.price, sz.stock||0, i);
        });
      }
    });

    update();
    res.json(getFullProduct(id));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/products/:id/toggle — admin ──────────────────
router.patch('/:id/toggle', requireAdmin, (req, res) => {
  try {
    const id = +req.params.id;
    const p  = db.prepare('SELECT active FROM products WHERE id=?').get(id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const newActive = p.active ? 0 : 1;
    db.prepare("UPDATE products SET active=?, updated_at=datetime('now') WHERE id=?").run(newActive, id);
    res.json({ active: !!newActive });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/products/:id/stock — admin ───────────────────
router.patch('/:id/stock', requireAdmin, (req, res) => {
  try {
    const { sizeId, stock } = req.body;
    if (sizeId === undefined || stock === undefined) {
      return res.status(400).json({ error: 'sizeId and stock required' });
    }
    const newStock = Math.max(0, parseInt(stock));
    db.prepare('UPDATE product_sizes SET stock=? WHERE id=? AND product_id=?')
      .run(newStock, sizeId, +req.params.id);
    res.json({ success: true, stock: newStock });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/products/:id — admin ────────────────────────
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id=?').run(+req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
