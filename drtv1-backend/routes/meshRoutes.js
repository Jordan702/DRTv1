const express = require('express');
const router = express.Router();
const { ethers } = require("ethers");
const fetch = require("node-fetch");
require("dotenv").config();

const tokenRegistry = require('../drtv1-frontend/tokenRegistry.json');

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC || process.env.MAINNET_RPC_URL);
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
  const pair = getPairAddress(tokenA, tokenB);
  const code = await provider.getCode(pair);
  const exists = code && code !== '0x';
  console.log(`Pair ${tokenA.slice(0,6)} / ${tokenB.slice(0,6)} → ${exists ? "✅ Exists" : "❌ Missing"} @ ${pair}`);
  return exists;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

router.post('/api/meshRoute', async (req, res) => {
  const { tokenIn, tokenOut, amountIn } = req.body;
  if (!tokenIn || !tokenOut || !amountIn) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const tokens = Object.values(tokenRegistry)
      .filter(t => t.address && t.address !== tokenIn && t.address !== tokenOut);
    const shuffled = shuffle(tokens);
    
    const flatPath = [tokenIn];
    let last = tokenIn;

    for (let i = 0; i < shuffled.length && flatPath.length < 30; i++) {
      const next = shuffled[i].address;
      if (await poolExists(last, next)) {
        flatPath.push(next);
        last = next;
      }
    }

    if (!(await poolExists(last, tokenOut))) {
      return res.status(400).json({ error: `❌ No final pool from ${last} to ${tokenOut}` });
    }
    flatPath.push(tokenOut);

    const wrappedPath = [];
    for (let i = 0; i < flatPath.length - 1; i++) {
      wrappedPath.push([flatPath[i], flatPath[i + 1]]);
    }

    const response = await fetch('https://drtv1-backend.onrender.com/api/meshSwap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn, tokenOut, amountIn, paths: wrappedPath })
    });

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (err) {
    console.error("❌ meshRoute error:", err);
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
});

module.exports = router;
