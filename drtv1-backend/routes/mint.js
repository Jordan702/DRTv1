// routes/mint.js
const express = require("express");
const router = express.Router();
const { mintDRTv1 } = require("../controllers/MintController");

router.post("/", mintDRTv1);

module.exports = router;
