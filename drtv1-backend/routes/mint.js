// routes/mint.js
const express = require("express");
const router = express.Router();
const { mintsETH } = require("../controllers/MintController");

router.post("/", mintsETH);

module.exports = router;
