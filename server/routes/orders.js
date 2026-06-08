// ============================================================
//  The Twins Coffee® — Orders Routes (SQLite)
// ============================================================
const express  = require('express');
const router   = express.Router();
const { db, normalizeOrder } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ─── POST /api/orders — place order (public) ─────────────────
router.post('/', (req, res) => {
  try {
    const { id, customerName, customerPhone, customerAddress,
            city, items, shippingId, shippingName, shippingPrice,
            subtotal, total, notes } = req.body;

    if (!customerName || !items || !items.length || !total) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    const orderId = id || ('ORD-' + Date.now().toString(36).toUpperCase());

    db.prepare(`
      INSERT INTO orders
        (id, customer_name, customer_phone, customer_address, city,
         items, shipping_id, shipping_name, shipping_price, subtotal, total, notes, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')
    `).run(orderId, customerName, customerPhone||'', customerAddress||'', city||'',
           JSON.stringify(items), shippingId||null, shippingName||'', shippingPrice||0,
           subtotal, total, notes||'');

    // Decrement stock
    items.forEach(item => {
      if (item.sizeId) {
        db.prepare('UPDATE product_sizes SET stock = MAX(0, stock - ?) WHERE id=?')
          .run(item.qty || 1, item.sizeId);
      }
    });

    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
    res.status(201).json({ success: true, orderId, order: normalizeOrder(order) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/orders — all orders (admin) ────────────────────
router.get('/', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.json(rows.map(normalizeOrder));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/orders/:id — single order (admin) ──────────────
router.get('/:id', requireAdmin, (req, res) => {
  try {
    const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    if (!o) return res.status(404).json({ error: 'Order not found' });
    res.json(normalizeOrder(o));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/orders/:id/status — update status (admin) ────
router.patch('/:id/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','processing','shipped','delivered','cancelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be: ${valid.join(', ')}` });
    }
    db.prepare("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?")
      .run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    res.json(normalizeOrder(updated));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/orders/:id — delete (admin) ─────────────────
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/orders — clear all (admin) ──────────────────
router.delete('/', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM orders').run();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
