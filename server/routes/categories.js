const express = require('express');
const router  = express.Router();
const { supabase, normalizeCategory } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── GET /api/categories — public ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(normalizeCategory));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/categories — admin ────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, name_ar, slug, active = 1, image = '' } = req.body;
    const { data, error } = await supabase.from('categories').insert([{ 
      name, name_ar, slug, active: active !== 0, image 
    }]).select().single();
    if (error) throw error;
    res.json(normalizeCategory(data));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/categories/:id — admin ─────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, name_ar, slug, active, image } = req.body;
    const { data, error } = await supabase.from('categories').update({
      name, name_ar, slug, active: active !== 0, image 
    }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeCategory(data));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/categories/:id — admin ──────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
