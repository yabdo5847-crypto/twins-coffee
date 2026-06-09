const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(categories);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, name_ar, slug, active = 1 } = req.body;
    const info = db.prepare('INSERT INTO categories (name, name_ar, slug, active) VALUES (?,?,?,?)')
                   .run(name, name_ar, slug, active);
    const newCat = db.prepare('SELECT * FROM categories WHERE id=?').get(info.lastInsertRowid);
    res.json(newCat);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { name, name_ar, slug, active } = req.body;
    db.prepare('UPDATE categories SET name=?, name_ar=?, slug=?, active=? WHERE id=?')
      .run(name, name_ar, slug, active, req.params.id);
    const updated = db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id);
    res.json(updated);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
