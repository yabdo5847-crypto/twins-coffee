const express  = require('express');
const router   = express.Router();
const { supabase, normalizeProduct } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── GET /api/products — public ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(normalizeProduct));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/products/all — admin ───────────────────────────
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(normalizeProduct));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/products/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Product not found' });
    res.json(normalizeProduct(data));
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

    const { data, error } = await supabase.from('products').insert([{
      name, name_ar: nameAr || '', category: category || 'coffee', description: description || '', badge: badge || '',
      has_type: !!hasType, has_roast: !!hasRoast, featured: !!featured, active: active !== false,
      images: images || [], variant_images: variantImages || {}, colors: colors || [],
      sizes: sizes.map((sz, i) => ({ label: sz.label, price: sz.price, stock: sz.stock || 0, sortOrder: i }))
    }]).select().single();

    if (error) throw error;
    res.status(201).json(normalizeProduct(data));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PUT /api/products/:id — admin ───────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, nameAr, category, description, badge, hasType, hasRoast,
            featured, active, images, variantImages, colors, sizes } = req.body;
            
    const updateData = {
      name, name_ar: nameAr || '', category: category || 'coffee', description: description || '', badge: badge || '',
      has_type: !!hasType, has_roast: !!hasRoast, featured: !!featured, active: active !== false,
      images: images || [], variant_images: variantImages || {}, colors: colors || []
    };
    
    if (sizes && sizes.length) {
      updateData.sizes = sizes.map((sz, i) => ({ label: sz.label, price: sz.price, stock: sz.stock || 0, sortOrder: i }));
    }

    const { data, error } = await supabase.from('products').update(updateData).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    
    res.json(normalizeProduct(data));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/products/:id/toggle — admin ──────────────────
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { data: p, error: fetchError } = await supabase.from('products').select('active').eq('id', req.params.id).single();
    if (fetchError || !p) return res.status(404).json({ error: 'Not found' });
    
    const { data, error } = await supabase.from('products').update({ active: !p.active }).eq('id', req.params.id).select().single();
    if (error) throw error;
    
    res.json({ active: data.active });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/products/:id/stock — admin ───────────────────
router.patch('/:id/stock', requireAdmin, async (req, res) => {
  try {
    const { sizeId, stock } = req.body;
    if (sizeId === undefined || stock === undefined) {
      return res.status(400).json({ error: 'sizeId and stock required' });
    }
    
    const { data: p, error: fetchError } = await supabase.from('products').select('sizes').eq('id', req.params.id).single();
    if (fetchError || !p) return res.status(404).json({ error: 'Not found' });
    
    let updated = false;
    const newSizes = p.sizes.map(sz => {
      if (sz.id === sizeId || sz.label === sizeId) { // Fallback to label if id is not present
        updated = true;
        return { ...sz, stock: Math.max(0, parseInt(stock)) };
      }
      return sz;
    });

    if (!updated) return res.status(404).json({ error: 'Size not found' });
    
    const { error } = await supabase.from('products').update({ sizes: newSizes }).eq('id', req.params.id);
    if (error) throw error;
    
    res.json({ success: true, stock: Math.max(0, parseInt(stock)) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/products/:id — admin ────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
