const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');

router.post('/purchase', vaultController.handleDRTPurchase);
router.post('/redeem', vaultController.redeemSETH);

module.exports = router;
