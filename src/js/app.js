// ============================================================
//  THE TWINS COFFEE® — Shared App Logic v4 (Luxury Edition)
// ============================================================

/* ─────────────── Default Data ─────────────── */
const DEFAULT_PRODUCTS = [
  {
    id: 1, name: "Cardamom Coffee", nameAr: "قهوة تركية محوجة", category: "coffee",
    images: ["uploads/Professional_studio_product_photography_of_202606090156 (1).jpeg","uploads/Professional_studio_product_photography_of_202606090156 (2).jpeg"],
    description: "Premium 100% Arabica Turkish Coffee blended with natural ground cardamom. Rich, aromatic, and crafted for a perfect cup with thick traditional foam.",
    hasType: false, hasRoast: true,
    sizes: [{ label:"200g", price:180, stock:50 },{ label:"500g", price:380, stock:30 },{ label:"1kg", price:700, stock:20 }],
    badge: "Best Seller", featured: true, active: true
  },
  {
    id: 2, name: "Plain Coffee", nameAr: "قهوة تركية ساده", category: "coffee",
    images: ["uploads/Professional_studio_product_photography_of_202606090156 (3).jpeg","uploads/Professional_studio_product_photography_of_202606090156 (4).jpeg"],
    description: "Pure 100% Arabica Turkish Coffee with no additives. A clean, smooth, and balanced flavor that highlights the true essence of premium coffee beans.",
    hasType: false, hasRoast: true,
    sizes: [{ label:"200g", price:170, stock:60 },{ label:"500g", price:350, stock:40 },{ label:"1kg", price:650, stock:25 }],
    badge: "Classic", featured: true, active: true
  },
  {
    id: 3, name: "Premium Travel Cup", nameAr: "كوب سفر فاخر", category: "merch",
    images: ["uploads/Professional_studio_product_photography_of_202606090156 (5).jpeg","uploads/Professional_studio_product_photography_of_202606090156 (6).jpeg"],
    description: "Premium matte black stainless steel travel cup. Double-wall vacuum insulated to keep your Turkish coffee hot for hours.",
    hasType: false, hasRoast: false,
    sizes: [{ label:"Compact", price:450, stock:35 }],
    colors: [{ hex:"#1a1a1a", name:"T Logo / شعار" },{ hex:"#2c2c2c", name:"Signature / توقيع" }],
    badge: "Merch", featured: true, active: true
  }
];

const DEFAULT_SHIPPING = [
  { id:1, name:"Standard Delivery", nameAr:"توصيل عادي",       price:50,  days:"3-5 أيام",    active:true  },
  { id:2, name:"Express Delivery",  nameAr:"توصيل سريع",       price:120, days:"1-2 يوم",     active:true  },
  { id:3, name:"Same Day",          nameAr:"توصيل نفس اليوم",  price:200, days:"اليوم نفسه",  active:false }
];

// (Removed localStorage data methods: getProducts, getCategories, getShipping, getOrders)


/* ─────────────── Cart ─────────────── */
function getCart() {
  const s = localStorage.getItem('tc_cart');
  return s ? JSON.parse(s) : [];
}
function _saveCart(cart) {
  localStorage.setItem('tc_cart', JSON.stringify(cart));
  _refreshBadge();
  _renderDrawerItems();
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
  const cart = getCart(); const item = cart.find(c => c.key === key);
  if (item) item.qty = qty;
  _saveCart(cart);
}
function cartClear()  { _saveCart([]); }
function cartTotal()  { return getCart().reduce((s, i) => s + i.price * i.qty, 0); }

/* ─────────────── Cart Drawer ─────────────── */
function openCartDrawer() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('drawer-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  _renderDrawerItems();
}
function closeCartDrawer() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function _renderDrawerItems() {
  const body = document.getElementById('drawer-body');
  if (!body) return;
  const cart = getCart();

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="drawer-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        <p>Your cart is empty.</p>
        <a href="products.html" class="btn btn-gold btn-sm" onclick="closeCartDrawer()">Shop Now</a>
      </div>`;
    _updateDrawerSubtotal(0);
    return;
  }

  body.innerHTML = '';
  cart.forEach(item => {
    const opts = [item.size, item.type, item.roast, item.color].filter(Boolean).join(' · ');
    const div = document.createElement('div');
    div.className = 'drawer-item';
    div.innerHTML = `
      <div class="drawer-item-img"><img src="${item.image}" alt="${item.name}" loading="lazy"/></div>
      <div class="drawer-item-info">
        <div class="drawer-item-name">${item.name}</div>
        ${opts ? `<div class="drawer-item-opts">${opts}</div>` : ''}
        <div class="drawer-item-qty">
          <button class="di-qty-btn" data-key="${item.key}" data-delta="-1" aria-label="Decrease quantity of ${item.name}">−</button>
          <span class="di-qty-v">${item.qty}</span>
          <button class="di-qty-btn" data-key="${item.key}" data-delta="1" aria-label="Increase quantity of ${item.name}">+</button>
        </div>
      </div>
      <div class="drawer-item-right">
        <div class="drawer-item-price">${(item.price * item.qty).toLocaleString()} جنيه</div>
        <button class="drawer-item-remove btn-ghost" data-key="${item.key}" aria-label="Remove ${item.name} from cart">Remove</button>
      </div>`;
    body.appendChild(div);
  });

  // Events
  body.querySelectorAll('.di-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getCart().find(x => x.key === btn.dataset.key);
      if (c) cartSetQty(btn.dataset.key, c.qty + parseInt(btn.dataset.delta));
    });
  });
  body.querySelectorAll('.drawer-item-remove').forEach(btn => {
    btn.addEventListener('click', () => cartRemove(btn.dataset.key));
  });

  _updateDrawerSubtotal(cartTotal());
}

function _updateDrawerSubtotal(total) {
  const el = document.getElementById('drawer-subtotal');
  if (el) el.textContent = total.toLocaleString() + ' جنيه';
}

// Strict Monochrome - Theme logic removed

/* ─────────────── Toast ─────────────── */
function toast(msg, type = 'success') {
  let wrap = document.getElementById('tc-toasts');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'tc-toasts'; document.body.appendChild(wrap); }
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

/* ─────────────── Scroll Reveal ─────────────── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
}

function initScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.anim-up').forEach(el => obs.observe(el));
}

/* ─────────────── Star Rating HTML ─────────────── */
function starRating(n = 5) {
  return Array.from({ length: 5 }, (_, i) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${i < n ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>`
  ).join('');
}

/* ─────────────── Boot ─────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Version guard
  const DATA_VERSION = 'v5';
  if (localStorage.getItem('tc_data_version') !== DATA_VERSION) {
    localStorage.removeItem('tc_products');
    localStorage.removeItem('tc_shipping');
    localStorage.setItem('tc_data_version', DATA_VERSION);
  }

  _refreshBadge();

  // Navbar scroll
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

  // Cart drawer triggers
  document.querySelectorAll('[data-cart-open]').forEach(btn => {
    btn.addEventListener('click', openCartDrawer);
  });
  document.getElementById('drawer-overlay')?.addEventListener('click', closeCartDrawer);
  document.getElementById('drawer-close')?.addEventListener('click', closeCartDrawer);

  // Escape key closes drawer
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCartDrawer(); });

  // Scroll reveals
  initScrollReveal();
  initScrollAnim();

  // Lucide icons
  if (window.lucide) lucide.createIcons();
});
