const express = require("express");
const router = express.Router();
const { mintsETH, doBatchMint } = require("../controllers/MintController");

// Single mint endpoint for sETH
router.post("/", mintsETH);

// Batch mint endpoint for DRTv2
router.post("/batch-mint", doBatchMint);

module.exports = router;
