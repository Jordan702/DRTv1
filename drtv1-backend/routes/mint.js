const express = require("express");
const router = express.Router();

const { mintsETH, doBatchMint } = require("../controllers/MintController");

// Single mint endpoint
router.post("/", mintsETH);

// Batch mint endpoint
router.post("/batch-mint", doBatchMint);

module.exports = router;
