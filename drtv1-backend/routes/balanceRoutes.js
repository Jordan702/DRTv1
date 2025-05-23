const express = require('express');
const { getBalances } = require('../controllers/balanceController');
const router = express.Router();

router.get('/:address', getBalances);

module.exports = router;
