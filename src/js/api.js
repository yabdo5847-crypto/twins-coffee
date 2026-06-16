// The Twins Coffee® - Frontend API Layer (Supabase Serverless)

const SUPABASE_URL = 'https://bgijvwneyxrgrugxeyor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_seuq4SYX6RCWFRSBcEDchQ_SO7XHdPB';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ─── Configuration constants ─────────────────────────── */
const WHATSAPP_PHONE = '201066996287';

/* ─── Simple API cache (5-minute TTL) ─────────────────── */
const _cache = {};
const _cacheTTL = 5 * 60 * 1000;
function _bustCache(key) { if (key) delete _cache[key]; else Object.keys(_cache).forEach(k => delete _cache[k]); }
async function _cached(key, fn) {
  const now = Date.now();
  if (_cache[key] && (now - _cache[key].ts) < _cacheTTL) return _cache[key].data;
  const data = await fn();
  _cache[key] = { data, ts: now };
  return data;
}

/* ─── Auth token helpers ─────────────────────────────────── */
function getAuthToken()       { return localStorage.getItem('sb-auth-token'); } 
function setAuthToken(t)      { localStorage.setItem('sb-auth-token', t); }
function clearAuthTokens()    { localStorage.removeItem('sb-auth-token'); supabaseClient.auth.signOut(); }

async function isLoggedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return !!session;
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
async function adminLogin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setAuthToken(data.session.access_token);
  return { token: data.session.access_token, user: data.user };
}
async function adminLogout() {
  await supabaseClient.auth.signOut();
  clearAuthTokens();
}
async function apiVerifyToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error('Not logged in');
  return { valid: true, user: session.user };
}


/* ══════════════════════════════════════════════════════════
   PUBLIC DATA (PRODUCTS / BUNDLES)
══════════════════════════════════════════════════════════ */
function mapProduct(p) {
  if (p.product_sizes) {
    p.sizes = p.product_sizes; // Map relational table array to 'sizes' property for frontend compatibility
    delete p.product_sizes;
  } else if (!p.sizes) {
    p.sizes = [];
  }
  return p;
}

async function apiGetFeaturedProducts(filters = {}) {
  let query = supabaseClient.from('products').select('*, product_sizes(*)').eq('active', true);
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapProduct);
}

async function apiGetAllProducts() {
  return _cached('products', async () => {
    const { data, error } = await supabaseClient.from('products').select('*, product_sizes(*)');
    if (error) throw error;
    return data.map(mapProduct);
  });
}

async function apiGetProductById(id) {
  const { data, error } = await supabaseClient.from('products').select('*, product_sizes(*)').eq('id', id).single();
  if (error) throw error;
  return mapProduct(data);
}



/* ══════════════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════════════ */
async function apiGetAllCategories() {
  return _cached('categories', async () => {
    const { data, error } = await supabaseClient.from('categories').select('*');
    if (error) throw error;
    return data;
  });
}
async function apiAddCategory(catData) {
  _bustCache('categories');
  const { data, error } = await supabaseClient.from('categories').insert([catData]).select().single();
  if (error) throw error;
  return data;
}

async function apiUpdateCategory(id, updates) {
  _bustCache('categories');
  const { data, error } = await supabaseClient.from('categories').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
async function apiDeleteCategory(id) {
  _bustCache('categories');
  const { error } = await supabaseClient.from('categories').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

/* ══════════════════════════════════════════════════════════
   SHIPPING OPTIONS
══════════════════════════════════════════════════════════ */
async function apiGetShipping() {
  return _cached('shipping_active', async () => {
    const { data, error } = await supabaseClient.from('shipping_options').select('*').eq('active', true);
    if (error) throw error;
    return data;
  });
}
async function apiGetAllShipping() {
  return _cached('shipping_all', async () => {
    const { data, error } = await supabaseClient.from('shipping_options').select('*');
    if (error) throw error;
    return data;
  });
}
async function apiAddShippingOption(opt) {
  _bustCache('shipping_active'); _bustCache('shipping_all');
  const { data, error } = await supabaseClient.from('shipping_options').insert([opt]).select().single();
  if (error) throw error;
  return data;
}
async function apiUpdateShippingOption(id, updates) {
  _bustCache('shipping_active'); _bustCache('shipping_all');
  const { data, error } = await supabaseClient.from('shipping_options').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
async function apiDeleteShipping(id) {
  _bustCache('shipping_active'); _bustCache('shipping_all');
  const { error } = await supabaseClient.from('shipping_options').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

/* ─── Paymob (DISABLED in Serverless) ─────────────────────── */
async function apiCreatePaymobSession(orderId, method) {
  throw new Error("Online payments disabled in serverless mode.");
}

/* ══════════════════════════════════════════════════════════
   ADMIN ENDPOINTS (PRODUCTS)
══════════════════════════════════════════════════════════ */
async function apiAddProduct(productData) {
  _bustCache('products');
  const sizes = productData.sizes || [];
  delete productData.sizes;

  const { data, error } = await supabaseClient.from('products').insert([productData]).select().single();
  if (error) throw error;

  if (sizes.length > 0) {
    const sizesToInsert = sizes.map((s, index) => ({ ...s, product_id: data.id, sort_order: index }));
    const { error: sizeErr } = await supabaseClient.from('product_sizes').insert(sizesToInsert);
    if (sizeErr) throw sizeErr;
  }

  return await apiGetProductById(data.id);
}

async function apiUpdateProduct(id, updates) {
  _bustCache('products');
  const sizes = updates.sizes;
  delete updates.sizes;
  const colors = updates.colors;
  delete updates.colors;

  const { data, error } = await supabaseClient.from('products').update(updates).eq('id', id).select().single();
  if (error) throw error;

  if (sizes) {
    // Delete old sizes and insert new ones
    await supabaseClient.from('product_sizes').delete().eq('product_id', id);
    if (sizes.length > 0) {
      const sizesToInsert = sizes.map((s, index) => {
        const { id: _localId, ...sizeData } = s; // Remove local id if any
        return { ...sizeData, product_id: id, sort_order: index };
      });
      const { error: sizeErr } = await supabaseClient.from('product_sizes').insert(sizesToInsert);
      if (sizeErr) throw sizeErr;
    }
  }

  if (colors !== undefined) {
    // Delete old colors and insert new ones
    await supabaseClient.from('product_colors').delete().eq('product_id', id);
    if (colors.length > 0) {
      const colorsToInsert = colors.map((c, index) => {
        const { id: _localId, ...colorData } = c;
        return { ...colorData, product_id: id, sort_order: index };
      });
      const { error: colErr } = await supabaseClient.from('product_colors').insert(colorsToInsert);
      if (colErr) throw colErr;
    }
  }

  return await apiGetProductById(data.id);
}

async function apiDeleteProduct(id) {
  // Relying on ON DELETE CASCADE in Supabase
  const { error } = await supabaseClient.from('products').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

/* ══════════════════════════════════════════════════════════
   ORDERS & STATS
══════════════════════════════════════════════════════════ */
async function apiCreateOrder(orderData) {
  const payload = {
    id: orderData.id,
    customer_name: orderData.customerName,
    customer_phone: orderData.customerPhone,
    customer_address: orderData.customerAddress,
    city: orderData.city,
    items: orderData.items,
    shipping_id: orderData.shippingId,
    shipping_name: orderData.shippingName,
    notes: orderData.notes,
    shipping_price: orderData.shippingPrice,
    subtotal: orderData.subtotal,
    total: orderData.total,
    status: 'pending'
  };
  
  const { data, error } = await supabaseClient.from('orders').insert([payload]).select().single();
  if (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
  return data;
}
async function apiGetOrders() {
  let dbOrders = [];
  try {
    const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (data) {
      dbOrders = data.map(o => ({
        id: o.id,
        customer: {
          name: o.customer_name,
          phone: o.customer_phone,
          address: o.customer_address,
          city: o.city
        },
        items: o.items,
        shipping: o.shipping_id ? { id: o.shipping_id, name: o.shipping_name, price: o.shipping_price } : null,
        subtotal: o.subtotal,
        total: o.total,
        status: o.status,
        notes: o.notes,
        paymentMethod: o.payment_method,
        createdAt: o.created_at
      }));
    }
  } catch (e) { console.error('Error fetching orders:', e); }

  // Sort by date descending
  dbOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return dbOrders;
}
async function apiGetStats() {
  const orders = await apiGetOrders();
  const rev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeProducts = await apiGetAllProducts();
  return { totalRevenue: rev, totalOrders: orders.length, activeProducts: activeProducts.length, recentOrders: orders.slice(0,5) };
}

/* ══════════════════════════════════════════════════════════
   UPLOAD
══════════════════════════════════════════════════════════ */
async function uploadProductImage(file) {
  const fileExt = file.name.split('.').pop().toLowerCase();
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  const fileName = `${Date.now()}-${uniqueId}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
  return { url: data.publicUrl };
}

/* ══════════════════════════════════════════════════════════
   HELPERS & ALIASES
══════════════════════════════════════════════════════════ */
const apiCreateProduct = apiAddProduct;
const apiUpdateShipping = apiUpdateShippingOption;
const apiCreateShipping = apiAddShippingOption;
const apiPlaceOrder = apiCreateOrder;

async function apiUpdateStock(pid, sizeId, newStock) {
  const product = await apiGetProductById(pid);
  const sizes = product.sizes.map(s => s.id === sizeId ? { ...s, stock: newStock } : s);
  return apiUpdateProduct(pid, { sizes });
}

async function apiToggleProduct(pid) {
  const product = await apiGetProductById(pid);
  return apiUpdateProduct(pid, { active: !product.active });
}

async function apiClearOrders() {
  const { error } = await supabaseClient.from('orders').delete().not('id', 'is', null);
  if (error) {
    console.error('Error clearing orders:', error);
    throw error;
  }
}
