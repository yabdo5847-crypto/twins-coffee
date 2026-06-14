const express  = require('express');
const router   = express.Router();
const { supabase, normalizeShipping } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── GET /api/shipping — active only (public) ────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('shipping_options').select('*').eq('active', true).order('price', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(normalizeShipping));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/shipping/all — all (admin) ─────────────────────
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('shipping_options').select('*').order('price', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(normalizeShipping));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/shipping — add (admin) ────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, price, days, active } = req.body;
    if (!name || !nameAr || price === undefined || !days) {
      return res.status(400).json({ error: 'name, nameAr, price, days required' });
    }
    const { data, error } = await supabase.from('shipping_options').insert([{
      name, name_ar: nameAr, price, days, active: active !== false
    }]).select().single();
    if (error) throw error;
    res.status(201).json(normalizeShipping(data));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/shipping/:id — update (admin) ──────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, price, days, active } = req.body;
    const { data, error } = await supabase.from('shipping_options').update({
      name, name_ar: nameAr, price, days, active: !!active
    }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeShipping(data));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/shipping/:id — delete (admin) ───────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('shipping_options').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
