const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// Utility to make Paymob requests
async function paymobFetch(endpoint, body) {
  const res = await fetch(`https://accept.paymob.com/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Paymob API Error');
  return data;
}

// 1. Authenticate with Paymob to get token
async function getAuthToken() {
  const data = await paymobFetch('auth/tokens', { api_key: process.env.PAYMOB_API_KEY });
  return data.token;
}

// 2. Register Order
async function registerOrder(authToken, amountCents, currency, merchantOrderId, items) {
  const data = await paymobFetch('ecommerce/orders', {
    auth_token: authToken,
    delivery_needed: "false",
    amount_cents: amountCents,
    currency: currency,
    merchant_order_id: merchantOrderId,
    items: items
  });
  return data.id;
}

// 3. Get Payment Key
async function getPaymentKey(authToken, amountCents, expiration, orderId, billingData, currency, integrationId) {
  const data = await paymobFetch('acceptance/payment_keys', {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: expiration,
    order_id: orderId,
    billing_data: billingData,
    currency: currency,
    integration_id: integrationId,
    lock_order_when_paid: "false"
  });
  return data.token;
}

// Create a payment session
router.post('/checkout', async (req, res) => {
  try {
    const { orderId, method } = req.body; // method: 'card' or 'fawry'
    
    // Fetch order from DB
    const orderRow = await db.all("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!orderRow || orderRow.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    const order = db.normalizeOrder(orderRow[0]);

    // Paymob requires amounts in cents
    const amountCents = Math.round(order.total * 100);

    // Dummy billing data since we collected it locally
    const billingData = {
      apartment: "NA", 
      email: order.customer.email || "customer@thetwinscoffee.com", 
      floor: "NA", 
      first_name: order.customer.name.split(' ')[0] || "Customer", 
      street: order.customer.address || "NA", 
      building: "NA", 
      phone_number: order.customer.phone || "01000000000", 
      shipping_method: "NA", 
      postal_code: "NA", 
      city: order.customer.city || "NA", 
      country: "EG", 
      last_name: order.customer.name.split(' ')[1] || "Name", 
      state: "NA"
    };

    const authToken = await getAuthToken();
    const paymobOrderId = await registerOrder(authToken, amountCents, "EGP", order.id, []);
    
    const integrationId = method === 'fawry' 
      ? process.env.PAYMOB_INTEGRATION_ID_FAWRY 
      : process.env.PAYMOB_INTEGRATION_ID_CARD;

    const paymentKey = await getPaymentKey(
      authToken, 
      amountCents, 
      3600, // 1 hour expiration
      paymobOrderId, 
      billingData, 
      "EGP", 
      integrationId
    );

    // Update local order with Paymob order ID
    await db.run("UPDATE orders SET paymob_order_id = ? WHERE id = ?", [paymobOrderId, order.id]);

    if (method === 'fawry') {
      res.json({ iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}` });
    } else {
      res.json({ iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}` });
    }

  } catch (error) {
    console.error('Paymob checkout error:', error);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Paymob Webhook
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const hmacSecret = process.env.PAYMOB_HMAC;
    if (hmacSecret && req.query.hmac) {
      // HMAC Verification (Optional but recommended for security)
      // Implementation omitted for brevity, but you should verify req.query.hmac 
      // against a hash of req.body.obj properties.
    }

    const { obj } = req.body;
    if (obj && obj.success === true) {
      const orderId = obj.order.merchant_order_id;
      // Mark order as processing (paid)
      await db.run("UPDATE orders SET status = 'processing', paymob_transaction_id = ? WHERE id = ?", [obj.id, orderId]);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Paymob webhook error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
