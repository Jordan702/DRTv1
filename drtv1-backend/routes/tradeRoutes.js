const express = require('express');
const { buyDRTv1, sellDRTv1 } = require('../controllers/tradeController');
const router = express.Router();

router.post('/buyDRTv1', buyDRTv1);
router.post('/sellDRTv1', sellDRTv1);

module.exports = router;
