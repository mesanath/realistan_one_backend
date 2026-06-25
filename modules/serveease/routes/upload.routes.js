const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../../src/middleware/serveease-auth.middleware');

// Local disk storage (replace with S3 in production)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG/PNG/WEBP images allowed'));
  },
});

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

module.exports = router;
