//backend/routes/submit.js
const express = require('express');
const multer = require('multer');
const { verifyAndMint } = require('../controllers/resourceVerifier');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('proof'), verifyAndMint);

module.exports = router;
