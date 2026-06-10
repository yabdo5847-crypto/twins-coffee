// ============================================================
//  The Twins Coffee® — Main Server (SQLite Edition)
//  No external services needed. Everything is local.
// ============================================================
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const bcrypt  = require('bcryptjs');

const { initDb, getDb }         = require('./db');
const { generateToken }         = require('./middleware/auth');
const productsRouter            = require('./routes/products');
const ordersRouter              = require('./routes/orders');
const shippingRouter            = require('./routes/shipping');
const categoriesRouter          = require('./routes/categories');
const uploadRouter              = require('./routes/upload');
const paymobRouter              = require('./routes/paymob');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Serve uploaded files as static ──────────────────────────
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/products',   productsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/shipping',   shippingRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/upload',     uploadRouter);
app.use('/api/paymob',     paymobRouter);

// ─── Auth: Login ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const db    = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE email=?', [email.toLowerCase()]);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: admin.id, email: admin.email });
    res.json({ token, user: { id: admin.id, email: admin.email } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Auth: Verify Token ───────────────────────────────────────
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'twins-coffee-secret-change-in-production';
  try {
    const payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ valid: true, user: payload });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});


// ─── Auth: Create first admin (only if no admins exist) ──────
app.post('/api/auth/setup', async (req, res) => {
  try {
    const db    = getDb();
    const { n } = await db.get('SELECT COUNT(*) as n FROM admins');
    if (n > 0) return res.status(403).json({ error: 'Setup already done' });

    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'email and password (min 6 chars) required' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO admins (email, password_hash) VALUES (?,?)', [email.toLowerCase(), hash]);
    const token = generateToken({ email: email.toLowerCase() });
    res.json({ success: true, message: 'Admin account created!', token });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Serve static frontend files ─────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ─── Catch-all → index.html ──────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ─── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Start (wait for DB to be ready first) ───────────────────
async function start() {
  try {
    await initDb();
    app.listen(PORT, async () => {
      const db         = getDb();
      const { n }      = await db.get('SELECT COUNT(*) as n FROM admins');
      console.log('');
      console.log('☕  ══════════════════════════════════════════════════════════');
      console.log('☕  The Twins Coffee® — Backend Server (SQLite Edition)');
      console.log(`☕  Running on → http://localhost:${PORT}`);
      if (n === 0) {
        console.log('');
        console.log('⚠️   No admin account found!');
        console.log(`⚠️   Create one by visiting: http://localhost:${PORT}/setup.html`);
      }
      console.log('☕  ══════════════════════════════════════════════════════════');
      console.log('');
    });
  } catch(e) {
    console.error('💥 Failed to start server:', e.message);
    process.exit(1);
  }
}

start();
