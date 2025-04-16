//backend/routes/submit.js
const express = require('express');
const router = express.Router();
const { verifyAndMint } = require('../controllers/resourceVerifier');
const multer = require('multer');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', upload.single('proofFile'), verifyAndMint);

module.exports = router;
