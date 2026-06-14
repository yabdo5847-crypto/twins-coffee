// The Twins Coffee® - Frontend API Layer (Supabase Serverless)

const SUPABASE_URL = 'https://bgijvwneyxrgrugxeyor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_seuq4SYX6RCWFRSBcEDchQ_SO7XHdPB';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const { data, error } = await supabaseClient.from('products').select('*, product_sizes(*)');
  if (error) throw error;
  return data.map(mapProduct);
}

async function apiGetProductById(id) {
  const { data, error } = await supabaseClient.from('products').select('*, product_sizes(*)').eq('id', id).single();
  if (error) throw error;
  return mapProduct(data);
}

async function apiGetBundles() { return []; }
async function apiGetBundleById(id) { return null; }

/* ══════════════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════════════ */
async function apiGetAllCategories() {
  const { data, error } = await supabaseClient.from('categories').select('*');
  if (error) throw error;
  return data;
}
async function apiAddCategory(catData) {
  const { data, error } = await supabaseClient.from('categories').insert([catData]).select().single();
  if (error) throw error;
  return data;
}

async function apiUpdateCategory(id, updates) {
  const { data, error } = await supabaseClient.from('categories').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
async function apiDeleteCategory(id) {
  const { error } = await supabaseClient.from('categories').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

/* ══════════════════════════════════════════════════════════
   SHIPPING OPTIONS
══════════════════════════════════════════════════════════ */
async function apiGetShipping() {
  const { data, error } = await supabaseClient.from('shipping_options').select('*').eq('active', true);
  if (error) throw error;
  return data;
}
async function apiGetAllShipping() {
  const { data, error } = await supabaseClient.from('shipping_options').select('*');
  if (error) throw error;
  return data;
}
async function apiAddShippingOption(opt) {
  const { data, error } = await supabaseClient.from('shipping_options').insert([opt]).select().single();
  if (error) throw error;
  return data;
}
async function apiUpdateShippingOption(id, updates) {
  const { data, error } = await supabaseClient.from('shipping_options').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
async function apiDeleteShipping(id) {
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
  const sizes = productData.sizes || [];
  delete productData.sizes;

  const { data, error } = await supabaseClient.from('products').insert([productData]).select().single();
  if (error) throw error;

  if (sizes.length > 0) {
    const sizesToInsert = sizes.map((s, index) => ({ ...s, product_id: data.id, sort_order: index }));
    await supabaseClient.from('product_sizes').insert(sizesToInsert);
  }

  return await apiGetProductById(data.id);
}

async function apiUpdateProduct(id, updates) {
  const sizes = updates.sizes;
  delete updates.sizes;

  const { data, error } = await supabaseClient.from('products').update(updates).eq('id', id).select().single();
  if (error) throw error;

  if (sizes) {
    // Delete old sizes and insert new ones (simplest approach for sync)
    await supabaseClient.from('product_sizes').delete().eq('product_id', id);
    if (sizes.length > 0) {
      const sizesToInsert = sizes.map((s, index) => {
        const { id, ...sizeData } = s; // Remove local id if any
        return { ...sizeData, product_id: data.id, sort_order: index };
      });
      await supabaseClient.from('product_sizes').insert(sizesToInsert);
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
    payment_method: orderData.paymentMethod
  };
  
  // SECURE CHECKOUT: Use RPC to calculate totals and deduct inventory safely
  const { data, error } = await supabaseClient.rpc('place_order_secure', { order_payload: payload });
  if (error) throw error;
  return data;
}
async function apiGetOrders() {
  const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(o => ({
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
    createdAt: o.created_at
  }));
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
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
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
