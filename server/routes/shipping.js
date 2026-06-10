// ============================================================
//  The Twins Coffee® — Shipping Routes (SQLite async)
// ============================================================
const express  = require('express');
const router   = express.Router();
const { getDb, normalizeShipping } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── GET /api/shipping — active only (public) ────────────────
router.get('/', async (req, res) => {
  try {
    const db   = getDb();
    const rows = await db.all('SELECT * FROM shipping_options WHERE active=1 ORDER BY price');
    res.json(rows.map(normalizeShipping));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/shipping/all — all (admin) ─────────────────────
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const db   = getDb();
    const rows = await db.all('SELECT * FROM shipping_options ORDER BY price');
    res.json(rows.map(normalizeShipping));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/shipping — add (admin) ────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, price, days, active } = req.body;
    if (!name || !nameAr || price === undefined || !days) {
      return res.status(400).json({ error: 'name, nameAr, price, days required' });
    }
    const db     = getDb();
    const result = await db.run(
      'INSERT INTO shipping_options (name, name_ar, price, days, active) VALUES (?,?,?,?,?)',
      [name, nameAr, price, days, active !== false ? 1 : 0]
    );
    const s = await db.get('SELECT * FROM shipping_options WHERE id=?', [result.lastID]);
    res.status(201).json(normalizeShipping(s));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/shipping/:id — update (admin) ──────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, price, days, active } = req.body;
    const db = getDb();
    const id = +req.params.id;
    await db.run(
      'UPDATE shipping_options SET name=?, name_ar=?, price=?, days=?, active=? WHERE id=?',
      [name, nameAr, price, days, active ? 1 : 0, id]
    );
    const s = await db.get('SELECT * FROM shipping_options WHERE id=?', [id]);
    res.json(normalizeShipping(s));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/shipping/:id — delete (admin) ───────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM shipping_options WHERE id=?', [+req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
