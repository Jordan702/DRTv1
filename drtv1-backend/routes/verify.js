// backend/routes/verify.js

const express = require('express');
const router = express.Router();
const { verifySubmission } = require('../controllers/resourceVerifier');

// POST /api/verify
router.post('/', async (req, res) => {
  const { submission } = req.body;

  // Validate request body
  if (!submission) {
    return res.status(400).json({ error: 'Missing submission data in request body' });
  }

  try {
    const result = await verifySubmission(submission);
    res.json(result);
  } catch (error) {
    console.error('[verify.js] Verification failed:', error);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
});

module.exports = router;

