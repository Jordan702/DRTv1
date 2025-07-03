// meshRoute.js
const express = require('express');
const router = express.Router();
const { JsonRpcProvider } = require("ethers");
require("dotenv").config();

const tokenRegistry = require('../drtv1-frontend/tokenRegistry.json');

// Utility to randomly select hop tokens (excluding tokenIn & tokenOut)
function generateHops(tokenIn, tokenOut, count = 28) {
  const hops = [];
  const used = new Set([tokenIn.toLowerCase(), tokenOut.toLowerCase()]);
  const tokens = Object.values(tokenRegistry).filter(t =>
    t.address && !used.has(t.address.toLowerCase())
  );

  while (hops.length < count && tokens.length > 0) {
    const idx = Math.floor(Math.random() * tokens.length);
    const candidate = tokens.splice(idx, 1)[0];
    if (!used.has(candidate.address.toLowerCase())) {
      hops.push(candidate.address);
      used.add(candidate.address.toLowerCase());
    }
  }

  return hops;
}

router.post('/api/meshRoute', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.body;
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Step 1: Generate flat array: [tokenIn, hop1, hop2, ..., tokenOut]
    const flatPath = [tokenIn, ...generateHops(tokenIn, tokenOut), tokenOut];

    // Step 2: Convert to Uniswap-style hop segments [[A,B],[B,C],...]
    const wrappedPath = [];
    for (let i = 0; i < flatPath.length - 1; i++) {
      wrappedPath.push([flatPath[i], flatPath[i + 1]]);
    }

    // Step 3: Forward to backend /api/meshSwap
    const response = await fetch('https://drtv1-backend.onrender.com/api/meshSwap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn,
        tokenOut,
        amountIn,
        paths: wrappedPath
      })
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (err) {
    console.error("❌ meshRoute error:", err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;

