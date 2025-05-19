require('dotenv').config();
const express = require('express');
const router = express.Router();
const { liquidityCheck, executeTrade } = require('../controllers/drtradeController');

// ✅ Debugging: Ensure functions are properly loaded
console.log("🔎 LiquidityCheck function status:", typeof liquidityCheck);
console.log("🔎 ExecuteTrade function status:", typeof executeTrade);

// ✅ New Route: Fetch Live Liquidity Data
router.get('/liquidity', async (req, res) => {
  try {
    if (!global.liquidityCache || Object.keys(global.liquidityCache).length === 0) {
      console.error("❌ liquidityCache is empty or undefined");
      return res.status(500).json({ error: "❌ Liquidity data unavailable." });
    }
    return res.status(200).json(global.liquidityCache);
  } catch (error) {
    console.error("❌ Liquidity Fetch Error:", error);
    return res.status(500).json({ error: "❌ Failed to retrieve liquidity data." });
  }
});

// ✅ Corrected Routes
router.post('/liquidity-check', liquidityCheck); // Fixed the route name
router.post('/execute-trade', executeTrade); // Made route more descriptive

module.exports = router;
