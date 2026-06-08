// ============================================================
//  The Twins Coffee® — Frontend API Layer  v1
//  Replaces localStorage calls with real API calls.
//  Load this AFTER app.js on every page.
// ============================================================

const API_BASE = '/api';

/* ─── Auth token helpers ─────────────────────────────────── */
function getAuthToken()       { return localStorage.getItem('tc_auth_token'); }
function setAuthToken(t)      { localStorage.setItem('tc_auth_token', t); }
function clearAuthTokens()    { localStorage.removeItem('tc_auth_token'); }
function isLoggedIn()         { return !!getAuthToken(); }

/* ─── Fetch wrapper with auth header ─────────────────────── */
async function apiFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + url, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */

async function adminLogin(email, password) {
  const data = await fetch(API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(r => r.json());

  if (data.error) throw new Error(data.error);
  setAuthToken(data.token);
  return data;
}

async function adminSetup(email, password, secret) {
  const res = await fetch(API_BASE + '/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, secret })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Setup failed');
  return data;
}

async function adminLogout() {
  clearAuthTokens();
}

/* ══════════════════════════════════════════════════════════
   PRODUCTS  (async replacements for getProducts / saveProducts)
══════════════════════════════════════════════════════════ */

// Public — active products only
async function apiGetProducts() {
  return apiFetch('/products');
}

// Admin — all products including hidden
async function apiGetAllProducts() {
  return apiFetch('/products/all');
}

async function apiGetProductById(id) {
  return apiFetch(`/products/${id}`);
}

async function apiCreateProduct(data) {
  return apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
}

async function apiUpdateProduct(id, data) {
  return apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function apiToggleProduct(id) {
  return apiFetch(`/products/${id}/toggle`, { method: 'PATCH' });
}

async function apiUpdateStock(productId, sizeId, stock) {
  return apiFetch(`/products/${productId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ sizeId, stock })
  });
}

async function apiDeleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: 'DELETE' });
}

/* ══════════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════════ */

async function apiPlaceOrder(orderData) {
  return apiFetch('/orders', { method: 'POST', body: JSON.stringify(orderData) });
}

async function apiGetOrders() {
  return apiFetch('/orders');
}

async function apiGetOrderById(id) {
  return apiFetch(`/orders/${id}`);
}

async function apiUpdateOrderStatus(id, status) {
  return apiFetch(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

async function apiDeleteOrder(id) {
  return apiFetch(`/orders/${id}`, { method: 'DELETE' });
}

async function apiClearOrders() {
  return apiFetch('/orders', { method: 'DELETE' });
}

/* ══════════════════════════════════════════════════════════
   SHIPPING
══════════════════════════════════════════════════════════ */

async function apiGetShipping() {
  return apiFetch('/shipping');
}

async function apiGetAllShipping() {
  return apiFetch('/shipping/all');
}

async function apiCreateShipping(data) {
  return apiFetch('/shipping', { method: 'POST', body: JSON.stringify(data) });
}

async function apiUpdateShipping(id, data) {
  return apiFetch(`/shipping/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function apiDeleteShipping(id) {
  return apiFetch(`/shipping/${id}`, { method: 'DELETE' });
}

/* ══════════════════════════════════════════════════════════
   UPLOAD
══════════════════════════════════════════════════════════ */

async function apiUploadImage(file) {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(API_BASE + '/upload', {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json(); // { url, filename }
}
