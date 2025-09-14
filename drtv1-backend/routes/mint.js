// routes/mint.js
const express = require("express");
const router = express.Router();
const { mintsETH, router: mintRouter } = require("../controllers/MintController");

// Single mint endpoint (sETH or DRTv2 single mint)
router.post("/", mintsETH);

// Batch mint endpoint (100 tokens × N, handled in MintController)
router.use("/", mintRouter);

module.exports = router;
