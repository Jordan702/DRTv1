// route.js
const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/swapDRTforETH', controller.swapDRTforETH);
router.post('/swapETHforDRT', controller.swapETHforDRT);

module.exports = router;
