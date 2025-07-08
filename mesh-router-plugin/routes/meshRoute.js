// meshRoute.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pools = require('../drtv1-frontend/pools.json');
require('dotenv').config();

// Build graph of token connectivity
function buildTokenGraph(pools) {
  const graph = {};
  for (const pool of pools) {
    const a = pool.tokenA.address.toLowerCase();
    const b = pool.tokenB.address.toLowerCase();
    if (!graph[a]) graph[a] = new Set();
    if (!graph[b]) graph[b] = new Set();
    graph[a].add(b);
    graph[b].add(a);
  }
  return graph;
}

// BFS path finder from tokenIn to tokenOut
function findPath(graph, tokenIn, tokenOut, maxHops = 30) {
  const queue = [[tokenIn.toLowerCase()]];
  const visited = new Set();

  while (queue.length > 0) {
    const path = queue.shift();
    const last = path[path.length - 1];

    if (last === tokenOut.toLowerCase() && path.length <= maxHops + 1) {
      return path;
    }

    if (!graph[last]) continue;

    for (const neighbor of graph[last]) {
      if (!path.includes(neighbor)) {
        queue.push([...path, neighbor]);
      }
    }

    visited.add(last);
  }

  return null;
}

// Wrap into [[A,B],[B,C],...] format
function generateConnectedRoute(tokenIn, tokenOut, maxHops = 30) {
  const graph = buildTokenGraph(pools);
  const path = findPath(graph, tokenIn, tokenOut, maxHops);
  if (!path) return null;

  const hopPairs = [];
  for (let i = 0; i < path.length - 1; i++) {
    hopPairs.push([path[i], path[i + 1]]);
  }

  return hopPairs;
}

// Route handler
router.post('/api/meshRoute', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.body;
    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const wrappedPath = generateConnectedRoute(tokenIn, tokenOut, 30);
    if (!wrappedPath) {
      return res.status(400).json({ error: 'No viable route between tokens' });
    }

    const response = await fetch('https://drtv1-backend.onrender.com/api/meshSwap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn, tokenOut, amountIn, paths: wrappedPath })
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (err) {
    console.error("❌ meshRoute error:", err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;