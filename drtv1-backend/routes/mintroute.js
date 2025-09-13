const express = require("express");
const router = express.Router();
const { mintTokens } = require("../controllers/MintController");

// POST /api/mint
router.post("/", mintTokens);

module.exports = router;
