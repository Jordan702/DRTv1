// routes/drtradeRoute.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { liquidityCheck, executeTrade } = require('../controllers/drtradeController');

router.post('/', liquidityCheck);
router.post('/execute', executeTrade);

module.exports = router;
