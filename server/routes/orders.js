const express  = require('express');
const router   = express.Router();
const { supabase, normalizeOrder } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── POST /api/orders — place order (public) ─────────────────
router.post('/', async (req, res) => {
  try {
    const { id, customerName, customerPhone, customerAddress,
            city, items, shippingId, shippingName, shippingPrice,
            subtotal, total, notes, paymentMethod } = req.body;

    if (!customerName || !items || !items.length || !total) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    const orderId = id || ('ORD-' + Date.now().toString(36).toUpperCase());

    // Securely calculate total
    let calculatedTotal = 0;
    if (shippingId) {
      const { data: ship } = await supabase.from('shipping_options').select('price').eq('id', shippingId).single();
      if (ship) calculatedTotal += Number(ship.price);
    }
    for (const item of items) {
      const { data: p } = await supabase.from('products').select('sizes').eq('id', item.productId).single();
      if (p) {
        let sizeObj = p.sizes.find(s => s.id === item.sizeId || s.label === item.sizeId);
        if (sizeObj) {
           const qty = Number(item.qty) || Number(item.quantity) || 1;
           calculatedTotal += (Number(sizeObj.price) * qty);
           // Decrement stock
           const newSizes = p.sizes.map(s => {
             if (s.id === item.sizeId || s.label === item.sizeId) return { ...s, stock: Math.max(0, s.stock - qty) };
             return s;
           });
           await supabase.from('products').update({ sizes: newSizes }).eq('id', item.productId);
        }
      }
    }
    const secureTotal = calculatedTotal > 0 ? calculatedTotal : total;

    const { data: order, error } = await supabase.from('orders').insert([{
      custom_id: orderId,
      customer_name: customerName, customer_phone: customerPhone || '', customer_address: customerAddress || '', city: city || '',
      items, shipping_id: shippingId || null, shipping_name: shippingName || '', shipping_price: shippingPrice || 0,
      subtotal, total: secureTotal, notes: notes || '', payment_method: paymentMethod || 'cod', status: 'pending'
    }]).select().single();

    if (error) throw error;

    res.status(201).json({ success: true, orderId, order: normalizeOrder(order) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/orders — all orders (admin) ────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((rows || []).map(normalizeOrder));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/orders/:id — single order (admin) ──────────────
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { data: o, error } = await supabase.from('orders').select('*').eq('custom_id', req.params.id).single();
    if (error || !o) return res.status(404).json({ error: 'Order not found' });
    res.json(normalizeOrder(o));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/orders/:id/status — update status (admin) ────
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','processing','shipped','delivered','cancelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be: ${valid.join(', ')}` });
    }
    const { data: updated, error } = await supabase.from('orders').update({ status }).eq('custom_id', req.params.id).select().single();
    if (error || !updated) return res.status(404).json({ error: 'Order not found' });
    res.json(normalizeOrder(updated));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/orders/:id — delete (admin) ─────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('orders').delete().eq('custom_id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/orders — clear all (admin) ──────────────────
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('orders').delete().neq('id', 0); // Delete all rows
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
