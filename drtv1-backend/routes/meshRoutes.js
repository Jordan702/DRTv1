const express = require('express');
const router = express.Router();
const { ethers } = require("ethers");
const fetch = require("node-fetch");
require("dotenv").config();

const tokenRegistry = require('../drtv1-frontend/tokenRegistry.json');

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC || process.env.MAINNET_RPC);

// Uniswap V2 Factory
const UNISWAP_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const INIT_CODE_HASH = "0x96e8ac4277198fff5f97f64f52a84324ba619eca72ca36c9e5ef15f8b41e0d5a";

function getPairAddress(tokenA, tokenB) {
  const [token0, token1] = [tokenA, tokenB].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return ethers.getCreate2Address(
    UNISWAP_FACTORY,
    ethers.solidityPackedKeccak256(['address', 'address'], [token0, token1]),
    INIT_CODE_HASH
  );
}

async function poolExists(tokenA, tokenB) {
  const pairAddress = getPairAddress(tokenA, tokenB);
  const code = await provider.getCode(pairAddress);
  return code !== '0x';
}

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

    const flatPath = [tokenIn];
    const hops = generateHops(tokenIn, tokenOut, 28);

    for (let i = 0; i < hops.length; i++) {
      const prev = flatPath[flatPath.length - 1];
      const next = hops[i];
      const exists = await poolExists(prev, next);
      if (exists) flatPath.push(next);
      if (flatPath.length >= 30) break;
    }

    // Must end with tokenOut, but only if a pool exists
    const final = flatPath[flatPath.length - 1];
    if (await poolExists(final, tokenOut)) {
      flatPath.push(tokenOut);
    } else {
      return res.status(400).json({ error: 'No valid route to tokenOut. Not enough pools.' });
    }

    const wrappedPath = [];
    for (let i = 0; i < flatPath.length - 1; i++) {
      wrappedPath.push([flatPath[i], flatPath[i + 1]]);
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
