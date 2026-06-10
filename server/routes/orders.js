// ============================================================
//  The Twins Coffee® — Orders Routes (SQLite async)
// ============================================================
const express  = require('express');
const router   = express.Router();
const { getDb, normalizeOrder } = require('../db');
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

    const db      = getDb();
    const orderId = id || ('ORD-' + Date.now().toString(36).toUpperCase());

    // Securely calculate total from DB
    let calculatedTotal = 0;
    if (shippingId) {
      const ship = await db.get('SELECT price FROM shipping_options WHERE id=?', [shippingId]);
      if (ship) calculatedTotal += ship.price;
    }
    for (const item of items) {
      const sizeRow = await db.get(
        'SELECT price FROM product_sizes WHERE id=? AND product_id=?',
        [item.sizeId, item.productId]
      );
      if (sizeRow) calculatedTotal += (sizeRow.price * (item.quantity || item.qty || 1));
    }
    const secureTotal = calculatedTotal > 0 ? calculatedTotal : total;

      `INSERT INTO orders
        (id, customer_name, customer_phone, customer_address, city,
         items, shipping_id, shipping_name, shipping_price, subtotal, total, notes, status, payment_method)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)`,
      [orderId, customerName, customerPhone||'', customerAddress||'', city||'',
       JSON.stringify(items), shippingId||null, shippingName||'', shippingPrice||0,
       subtotal, secureTotal, notes||'', paymentMethod||'cod']

    // Decrement stock
    for (const item of items) {
      if (item.sizeId) {
        await db.run(
          'UPDATE product_sizes SET stock = MAX(0, stock - ?) WHERE id=?',
          [item.qty || 1, item.sizeId]
        );
      }
    }

    const order = await db.get('SELECT * FROM orders WHERE id=?', [orderId]);
    res.status(201).json({ success: true, orderId, order: normalizeOrder(order) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/orders — all orders (admin) ────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const db   = getDb();
    const rows = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows.map(normalizeOrder));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/orders/:id — single order (admin) ──────────────
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const o  = await db.get('SELECT * FROM orders WHERE id=?', [req.params.id]);
    if (!o) return res.status(404).json({ error: 'Order not found' });
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
    const db = getDb();
    await db.run("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?",
      [status, req.params.id]);
    const updated = await db.get('SELECT * FROM orders WHERE id=?', [req.params.id]);
    res.json(normalizeOrder(updated));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/orders/:id — delete (admin) ─────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM orders WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/orders — clear all (admin) ──────────────────
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM orders');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
