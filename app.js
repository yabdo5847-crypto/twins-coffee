// ============================================================
//  THE TWINS COFFEE®  —  Shared App Logic  v3
// ============================================================

/* ─────────────── Default Data ─────────────── */
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Cardamom Coffee",
    nameAr: "قهوة تركية محوجة",
    category: "coffee",
    images: [
      "uploads/Transform_this_product_into_a_202605300538 (3).jpeg",
      "uploads/Transform_this_product_into_a_202605300538 (2).jpeg"
    ],
    description: "Premium 100% Arabica Turkish Coffee blended with natural ground cardamom. Rich, aromatic, and crafted for a perfect cup with thick traditional foam.",
    hasType: false,
    hasRoast: true,
    sizes: [
      { label: "200g", price: 180, stock: 50 },
      { label: "500g", price: 380, stock: 30 },
      { label: "1kg",  price: 700, stock: 20 }
    ],
    badge: "Best Seller",
    featured: true,
    active: true
  },
  {
    id: 2,
    name: "Plain Coffee",
    nameAr: "قهوة تركية ساده",
    category: "coffee",
    images: [
      "uploads/Transform_this_product_into_a_202605300538 (5).jpeg",
      "uploads/Transform_this_product_into_a_202605300538 (4).jpeg"
    ],
    description: "Pure 100% Arabica Turkish Coffee with no additives. A clean, smooth, and balanced flavor that highlights the true essence of premium coffee beans.",
    hasType: false,
    hasRoast: true,
    sizes: [
      { label: "200g", price: 170, stock: 60 },
      { label: "500g", price: 350, stock: 40 },
      { label: "1kg",  price: 650, stock: 25 }
    ],
    badge: "Classic",
    featured: true,
    active: true
  },
  {
    id: 3,
    name: "Premium Travel Cup",
    nameAr: "كوب سفر فاخر",
    category: "merch",
    images: [
      "uploads/Transform_this_product_into_a_202605300538.jpeg",
      "uploads/Transform_this_product_into_a_202605300538 (1).jpeg"
    ],
    description: "Premium matte black stainless steel travel cup. Double-wall vacuum insulated to keep your Turkish coffee hot for hours. Available in two designs.",
    hasType: false,
    hasRoast: false,
    sizes: [
      { label: "Compact", price: 450, stock: 35 }
    ],
    colors: [
      { hex: "#1a1a1a", name: "T Logo / شعار" },
      { hex: "#2c2c2c", name: "Signature / توقيع" }
    ],
    badge: "Merch",
    featured: true,
    active: true
  }
];

const DEFAULT_SHIPPING = [
  { id: 1, name: "Standard Delivery", nameAr: "توصيل عادي",       price: 50,  days: "3-5 أيام",     active: true  },
  { id: 2, name: "Express Delivery",  nameAr: "توصيل سريع",       price: 120, days: "1-2 يوم",      active: true  },
  { id: 3, name: "Same Day",          nameAr: "توصيل نفس اليوم",  price: 200, days: "اليوم نفسه",   active: false }
];

/* ─────────────── Products ─────────────── */
function getProducts() {
  const s = localStorage.getItem('tc_products');
  return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
}
function saveProducts(p) { localStorage.setItem('tc_products', JSON.stringify(p)); }
function getProductById(id) { return getProducts().find(p => p.id === +id) || null; }

/* ─────────────── Shipping ─────────────── */
function getShipping() {
  const s = localStorage.getItem('tc_shipping');
  return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_SHIPPING));
}
function saveShipping(s) { localStorage.setItem('tc_shipping', JSON.stringify(s)); }

/* ─────────────── Orders ─────────────── */
function getOrders() {
  const s = localStorage.getItem('tc_orders');
  return s ? JSON.parse(s) : [];
}
function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem('tc_orders', JSON.stringify(orders));
}

/* ─────────────── Cart ─────────────── */
function getCart() {
  const s = localStorage.getItem('tc_cart');
  return s ? JSON.parse(s) : [];
}
function _saveCart(cart) {
  localStorage.setItem('tc_cart', JSON.stringify(cart));
  _refreshBadge();
}
function _refreshBadge() {
  const n = getCart().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = n;
    b.classList.toggle('visible', n > 0);
  });
}
function cartAdd(item) {
  const cart = getCart();
  const key = [item.productId, item.size, item.type||'', item.roast||''].join('|');
  const ex  = cart.find(c => c.key === key);
  if (ex) ex.qty += (item.qty || 1);
  else     cart.push({ ...item, key, qty: item.qty || 1 });
  _saveCart(cart);
}
function cartRemove(key) { _saveCart(getCart().filter(c => c.key !== key)); }
function cartSetQty(key, qty) {
  if (qty <= 0) return cartRemove(key);
  const cart = getCart();
  const item = cart.find(c => c.key === key);
  if (item) item.qty = qty;
  _saveCart(cart);
}
function cartClear()  { _saveCart([]); }
function cartTotal()  { return getCart().reduce((s, i) => s + i.price * i.qty, 0); }

/* ─────────────── Theme ─────────────── */
function getTheme()  { return localStorage.getItem('tc_theme') || 'dark'; }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('tc_theme', t);
  document.querySelectorAll('.theme-icon').forEach(el => {
    el.innerHTML = t === 'dark'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="4" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  });
  // Update admin theme toggle button if exists
  document.querySelectorAll('[data-action="theme"] .theme-label').forEach(el => {
    el.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
  });
}
function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

/* ─────────────── Toast ─────────────── */
function toast(msg, type = 'success') {
  let wrap = document.getElementById('tc-toasts');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'tc-toasts';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `tc-toast tc-toast--${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 350); }, 3000);
}

/* ─────────────── Helpers ─────────────── */
function genId() { return 'ORD-' + Date.now().toString(36).toUpperCase(); }

function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' });
}

/* ─────────────── Scroll animations ─────────────── */
function initScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.anim-up').forEach(el => obs.observe(el));
}

/* ─────────────── Boot ─────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Version guard: clear old cached products when data version changes
  const DATA_VERSION = 'v4';
  if (localStorage.getItem('tc_data_version') !== DATA_VERSION) {
    localStorage.removeItem('tc_products');
    localStorage.removeItem('tc_shipping');
    localStorage.setItem('tc_data_version', DATA_VERSION);
  }

  applyTheme(getTheme());
  _refreshBadge();

  // Theme buttons
  document.querySelectorAll('[data-action="theme"]').forEach(b => b.addEventListener('click', toggleTheme));

  // Navbar scroll effect
  const nb = document.getElementById('navbar');
  if (nb) window.addEventListener('scroll', () => nb.classList.toggle('scrolled', scrollY > 50));

  // Hamburger
  const hb = document.getElementById('hamburger');
  const nl = document.getElementById('nav-links');
  if (hb && nl) {
    hb.addEventListener('click', () => { hb.classList.toggle('open'); nl.classList.toggle('open'); });
    nl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      hb.classList.remove('open'); nl.classList.remove('open');
    }));
  }

  initScrollAnim();

  // Dynamic Lucide icons rendering
  if (window.lucide) {
    lucide.createIcons();
  }
});
