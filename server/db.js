// ============================================================
//  The Twins Coffee® — Supabase Database Layer
// ============================================================
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Usually use service_role key for backend

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDb() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase URL or Key is missing. Please check your .env file.');
    return;
  }
  console.log('✅ Supabase client initialized!');

  // Seeding logic can be done via the SQL schema file.
  // We assume the schema is created and seeded.
}

// Helper Normalizers (To maintain compatibility with current frontend)
function normalizeProduct(p) {
  return {
    id:          p.id,
    name:        p.name,
    nameAr:      p.name_ar,
    category:    p.category,
    description: p.description,
    badge:       p.badge || '',
    hasType:     !!p.has_type,
    hasRoast:    !!p.has_roast,
    featured:    !!p.featured,
    active:      !!p.active,
    images:      p.images || [],
    variantImages: p.variant_images || {},
    colors:      p.colors || [],
    sizes:       (p.sizes || []).map(s => ({ id: s.id || s.label, label: s.label, price: s.price, stock: s.stock })),
    createdAt:   p.created_at,
  };
}

function normalizeOrder(o) {
  return {
    id:           o.custom_id || o.id,
    customer: {
      name:    o.customer_name,
      phone:   o.customer_phone,
      address: o.customer_address,
      city:    o.city,
    },
    items:        o.items || [],
    shippingId:   o.shipping_id,
    shippingName: o.shipping_name,
    shippingPrice: o.shipping_price,
    subtotal:     o.subtotal,
    total:        o.total,
    status:       o.status,
    notes:        o.notes,
    paymentMethod: o.payment_method,
    paymobOrderId: o.paymob_order_id,
    paymobTransactionId: o.paymob_transaction_id,
    date:         new Date(o.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }),
    createdAt:    o.created_at,
  };
}

function normalizeShipping(s) {
  return { id: s.id, name: s.name, nameAr: s.name_ar, price: s.price, days: s.days, active: !!s.active };
}

function normalizeCategory(c) {
  return { id: c.id, name: c.name, nameAr: c.name_ar, slug: c.slug, image: c.image, active: !!c.active };
}

module.exports = { 
  supabase,
  initDb,
  normalizeProduct, 
  normalizeOrder, 
  normalizeShipping,
  normalizeCategory
};
