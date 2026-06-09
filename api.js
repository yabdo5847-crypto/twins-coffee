// The Twins Coffee® - Frontend API Layer
const API_URL = 'http://localhost:3000/api';

/* ─── Auth token helpers ─────────────────────────────────── */
function getAuthToken()       { return localStorage.getItem('tc_auth_token'); }
function setAuthToken(t)      { localStorage.setItem('tc_auth_token', t); }
function clearAuthTokens()    { localStorage.removeItem('tc_auth_token'); }
function isLoggedIn()         { return !!getAuthToken(); }

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_URL + endpoint, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
async function adminLogin(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setAuthToken(data.token);
  return data;
}
async function adminLogout() {
  clearAuthTokens();
}

/* ══════════════════════════════════════════════════════════
   PUBLIC DATA (PRODUCTS / BUNDLES)
══════════════════════════════════════════════════════════ */
async function apiGetFeaturedProducts(filters = {}) {
  const data = await apiFetch('/products?active=true');
  if (filters.category && filters.category !== 'all') {
    return data.filter(p => p.category === filters.category);
  }
  return data;
}
async function apiGetAllProducts() { return apiFetch('/products'); }
async function apiGetProductById(id) { return apiFetch(`/products/${id}`); }

async function apiGetBundles() { return []; }
async function apiGetBundleById(id) { return null; }

/* ══════════════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════════════ */
async function apiGetAllCategories() { return apiFetch('/categories').catch(()=>[]); }
async function apiAddCategory(catData) { return apiFetch('/categories', { method: 'POST', body: JSON.stringify(catData) }); }
async function apiUpdateCategory(id, updates) { return apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(updates) }); }
async function apiDeleteCategory(id) { return apiFetch(`/categories/${id}`, { method: 'DELETE' }); }

/* ══════════════════════════════════════════════════════════
   SHIPPING OPTIONS
══════════════════════════════════════════════════════════ */
async function apiGetShipping() { return apiFetch('/shipping').catch(()=>[]); }
async function apiGetAllShipping() { return apiGetShipping(); }
async function apiAddShippingOption(opt) { return apiFetch('/shipping', { method: 'POST', body: JSON.stringify(opt) }); }
async function apiUpdateShippingOption(id, updates) { return apiFetch(`/shipping/${id}`, { method: 'PUT', body: JSON.stringify(updates) }); }
async function apiDeleteShippingOption(id) { return apiFetch(`/shipping/${id}`, { method: 'DELETE' }); }

/* ══════════════════════════════════════════════════════════
   ADMIN ENDPOINTS (PRODUCTS)
══════════════════════════════════════════════════════════ */
async function apiAddProduct(productData) { return apiFetch('/products', { method: 'POST', body: JSON.stringify(productData) }); }
async function apiUpdateProduct(id, updates) { return apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }); }
async function apiDeleteProduct(id) { return apiFetch(`/products/${id}`, { method: 'DELETE' }); }

/* ══════════════════════════════════════════════════════════
   ORDERS & STATS
══════════════════════════════════════════════════════════ */
async function apiCreateOrder(orderData) { return apiFetch('/orders', { method: 'POST', body: JSON.stringify(orderData) }); }
async function apiGetOrders() { return apiFetch('/orders').catch(()=>[]); }
async function apiGetStats() {
  const orders = await apiGetOrders();
  const rev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  return { totalRevenue: rev, totalOrders: orders.length, activeProducts: 0, recentOrders: orders.slice(0,5) };
}

/* ══════════════════════════════════════════════════════════
   UPLOAD
══════════════════════════════════════════════════════════ */
async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const token = getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_URL + '/upload', { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  // data.filename is returned by the server, adjust path as needed depending on your server's static mount
  return '/uploads/' + data.filename;
}
