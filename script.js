// ============================================================
// THE TWINS COFFEE® — JavaScript
// ============================================================

/* ---------- Cart State ---------- */
let cart = [];

/* ---------- DOM References ---------- */
const cartBtn     = document.getElementById('cart-btn');
const cartClose   = document.getElementById('cart-close');
const cartOverlay = document.getElementById('cart-overlay');
const cartSidebar = document.getElementById('cart-sidebar');
const cartCount   = document.getElementById('cart-count');
const cartItems   = document.getElementById('cart-items');
const cartEmpty   = document.getElementById('cart-empty');
const cartFooter  = document.getElementById('cart-footer');
const cartTotal   = document.getElementById('cart-total-price');
const navbar      = document.getElementById('navbar');
const hamburger   = document.getElementById('hamburger');
const navLinks    = document.getElementById('nav-links');
const filterBtns  = document.querySelectorAll('.filter-btn');
const productCards= document.querySelectorAll('.product-card');

/* ---------- Navbar Scroll Effect ---------- */
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  updateActiveNavLink();
});

/* ---------- Active Nav Link on Scroll ---------- */
function updateActiveNavLink() {
  const sections = ['home', 'products', 'about', 'contact'];
  const links    = document.querySelectorAll('.nav-link');
  let current    = 'home';

  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section && window.scrollY >= section.offsetTop - 120) {
      current = id;
    }
  });

  links.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

/* ---------- Hamburger Menu ---------- */
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
});

// Close mobile menu on link click
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
  });
});

/* ---------- Cart Functions ---------- */
function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

function addToCart(name, price) {
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  renderCart();
  openCart();
  animateCartButton();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  // Update badge
  cartCount.textContent = count;
  cartCount.classList.toggle('visible', count > 0);

  // Clear list area
  cartItems.innerHTML = '';

  if (cart.length === 0) {
    cartEmpty.style.display = 'flex';
    cartFooter.style.display = 'none';
    cartItems.appendChild(cartEmpty);
    return;
  }

  cartEmpty.style.display = 'none';
  cartFooter.style.display = 'block';

  cart.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-qty">x${item.qty}</div>
      <div class="cart-item-price">${(item.price * item.qty).toLocaleString()} جنيه</div>
      <button class="remove-btn" onclick="removeFromCart(${i})" aria-label="Remove item">✕</button>
    `;
    cartItems.appendChild(el);
  });

  cartTotal.textContent = `${total.toLocaleString()} جنيه`;
}

function animateCartButton() {
  cartBtn.style.transform = 'scale(1.25)';
  setTimeout(() => { cartBtn.style.transform = ''; }, 200);
}

/* ---------- Checkout Button ---------- */
document.getElementById('checkout-btn').addEventListener('click', () => {
  alert('Thank you for your order! We will contact you shortly to confirm your purchase. ☕');
  cart = [];
  renderCart();
  closeCart();
});

/* ---------- Product Filter Tabs ---------- */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    productCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.classList.remove('hidden');
        card.style.animation = 'fadeUp 0.4s ease both';
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

/* ---------- Intersection Observer – Fade-in on Scroll ---------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.product-card, .feature-item, .about-text, .about-image, .section-header')
  .forEach(el => {
    el.classList.add('fade-in-up');
    observer.observe(el);
  });

/* ---------- Contact Form ---------- */
function submitForm(e) {
  e.preventDefault();
  const form = document.getElementById('contact-form');
  const successMsg = document.getElementById('success-msg');
  form.style.display = 'none';
  successMsg.style.display = 'flex';
}

/* ---------- Smooth Scroll for Anchor Links ---------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      const navHeight = navbar.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ---------- Init ---------- */
renderCart();
