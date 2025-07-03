// meshRoute.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const tokenRegistry = require('../drtv1-frontend/tokenRegistry.json');
const realPools = [
  ["0x2c899a490902352afa33bafb7fe89c9dd142f9d1", "0x595832f8fc6bf59c85c527fec3740a1b7a361269"],
  ["0x595832f8fc6bf59c85c527fec3740a1b7a361269", "0x9e04f519b094f5f8210441e285f603f4d2b50084"],
  ["0x9e04f519b094f5f8210441e285f603f4d2b50084", "0xfc98e825a2264d890f9a1e68ed50e1526abccacd"],
  ["0xfc98e825a2264d890f9a1e68ed50e1526abccacd", "0xb96682a8f558b8199a2dc039b1dd8911e5068faf"],
  ["0xb96682a8f558b8199a2dc039b1dd8911e5068faf", "0x4674a4f24c5f63d53f22490fb3a08eaaad739ff8"],
  ["0x4674a4f24c5f63d53f22490fb3a08eaaad739ff8", "0x51db5ad35c671a87207d88fc11d593ac0c8415bd"],
  ["0x51db5ad35c671a87207d88fc11d593ac0c8415bd", "0x982b50e55394641ca975a0eec630b120b671391a"],
  ["0x982b50e55394641ca975a0eec630b120b671391a", "0xe027d939f7de6f521675907cf086f59e4d75b876"],
  ["0xe027d939f7de6f521675907cf086f59e4d75b876", "0xb9d27bc093ed0a3b7c18366266704cfe5e7af77b"],
  ["0xb9d27bc093ed0a3b7c18366266704cfe5e7af77b", "0x1161ab556baa457994b1d6a6cca3a7a6891009fd"],
  ["0x1161ab556baa457994b1d6a6cca3a7a6891009fd", "0x04c17b9d3b29a78f7bd062a57cf44fc633e71f85"],
  ["0x04c17b9d3b29a78f7bd062a57cf44fc633e71f85", "0x1416946162b1c2c871a73b07e932d2fb6c932069"]
  // Add more only if real pools exist.
];

router.post('/api/meshRoute', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.body;
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Filter hops that form a valid continuous path from tokenIn to tokenOut
    const validPath = [tokenIn];
    for (const [a, b] of realPools) {
      if (a.toLowerCase() === validPath[validPath.length - 1].toLowerCase()) {
        validPath.push(b);
        if (b.toLowerCase() === tokenOut.toLowerCase()) break;
      }
    }

    if (validPath[validPath.length - 1].toLowerCase() !== tokenOut.toLowerCase()) {
      return res.status(400).json({ error: 'No valid route found between tokens' });
    }

    const wrappedPath = [];
    for (let i = 0; i < validPath.length - 1; i++) {
      wrappedPath.push([validPath[i], validPath[i + 1]]);
    }

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
