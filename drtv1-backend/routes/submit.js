// backend/routes/submit.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyAndMint } = require('../controllers/resourceVerifier');

// Configure multer for 20MB limit and uploads folder
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Submission route
router.post('/', upload.single('proofFile'), async (req, res) => {
  try {
    await verifyAndMint(req, res);
  } catch (err) {
    console.error("❌ Route error in POST /api/verify:", err.message || err);
    return res.status(500).json({ error: 'Route-level failure.' });
  }
});

// Optional: Health check route
router.get('/', (req, res) => {
  res.send('✅ Submit route operational');
});

module.exports = router;
