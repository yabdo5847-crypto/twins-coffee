// ============================================================
//  The Twins Coffee® — Upload Routes
//  Saves images locally to server/uploads/ — no cloud storage
//  Returns a URL path like /uploads/filename.jpg
// ============================================================
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { requireAdmin } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Disk storage — files saved to /uploads with unique names
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|webp|gif)|video\/mp4/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image/video files are allowed'));
    }
  }
});

// ─── POST /api/upload ─────────────────────────────────────────
router.post('/', requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.filename });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /api/upload ───────────────────────────────────────
router.delete('/', requireAdmin, (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename required' });
    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(uploadsDir, safeName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
