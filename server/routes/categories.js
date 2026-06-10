const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── GET /api/categories — public ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db         = getDb();
    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/categories — admin ────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, name_ar, slug, active = 1, image = '' } = req.body;
    const db     = getDb();
    const info   = await db.run(
      'INSERT INTO categories (name, name_ar, slug, active, image) VALUES (?,?,?,?,?)',
      [name, name_ar, slug, active, image]
    );
    const newCat = await db.get('SELECT * FROM categories WHERE id=?', [info.lastID]);
    res.json(newCat);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/categories/:id — admin ─────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, name_ar, slug, active, image } = req.body;
    const db = getDb();
    await db.run(
      'UPDATE categories SET name=?, name_ar=?, slug=?, active=?, image=? WHERE id=?',
      [name, name_ar, slug, active, image, req.params.id]
    );
    const updated = await db.get('SELECT * FROM categories WHERE id=?', [req.params.id]);
    res.json(updated);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/categories/:id — admin ──────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
