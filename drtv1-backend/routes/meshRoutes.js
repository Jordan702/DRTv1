const express = require("express");
const router = express.Router();
const meshSwapController = require("../controllers/meshSwapController");

// POST /api/mesh/swap
router.post("/swap", meshSwapController.meshSwap);

module.exports = router;
