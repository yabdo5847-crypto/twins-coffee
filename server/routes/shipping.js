// ============================================================
//  The Twins Coffee® — Shipping Routes (SQLite)
// ============================================================
const express  = require('express');
const router   = express.Router();
const { db, normalizeShipping } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── GET /api/shipping — active only (public) ────────────────
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM shipping_options WHERE active=1 ORDER BY price').all();
    res.json(rows.map(normalizeShipping));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/shipping/all — all (admin) ─────────────────────
router.get('/all', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM shipping_options ORDER BY price').all();
    res.json(rows.map(normalizeShipping));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/shipping — add (admin) ────────────────────────
router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, nameAr, price, days, active } = req.body;
    if (!name || !nameAr || price === undefined || !days) {
      return res.status(400).json({ error: 'name, nameAr, price, days required' });
    }
    const result = db.prepare(
      'INSERT INTO shipping_options (name, name_ar, price, days, active) VALUES (?,?,?,?,?)'
    ).run(name, nameAr, price, days, active !== false ? 1 : 0);
    const s = db.prepare('SELECT * FROM shipping_options WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json(normalizeShipping(s));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/shipping/:id — update (admin) ──────────────────
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { name, nameAr, price, days, active } = req.body;
    db.prepare('UPDATE shipping_options SET name=?, name_ar=?, price=?, days=?, active=? WHERE id=?')
      .run(name, nameAr, price, days, active ? 1 : 0, +req.params.id);
    const s = db.prepare('SELECT * FROM shipping_options WHERE id=?').get(+req.params.id);
    res.json(normalizeShipping(s));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/shipping/:id — delete (admin) ───────────────
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM shipping_options WHERE id=?').run(+req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
