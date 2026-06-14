const SUPABASE_URL = 'https://bgijvwneyxrgrugxeyor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_seuq4SYX6RCWFRSBcEDchQ_SO7XHdPB';

const payload = {
  id: "test-" + Date.now(),
  customer_name: "Test User",
  customer_phone: "01012345678",
  customer_address: "Cairo",
  city: "Cairo",
  items: [{"name": "Coffee"}],
  shipping_id: 1,
  shipping_name: "Standard Delivery",
  notes: "",
  shipping_price: 50,
  subtotal: 100,
  total: 150,
  status: "pending"
};

fetch(`${SUPABASE_URL}/rest/v1/orders`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(payload)
})
.then(res => res.json().then(data => ({status: res.status, body: data})))
.then(console.log)
.catch(console.error);
