// swapRoute.js
const pools = require("../pools.json");

// Build route from tokenIn to tokenOut using the pool graph
function buildRoute(tokenIn, tokenOut, maxHops = 30) {
  const visited = new Set();
  const queue = [[tokenIn]];

  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];

    if (last === tokenOut) return path;
    if (path.length > maxHops) continue;

    visited.add(last);
    const neighbors = getNeighbors(last);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

function getNeighbors(tokenAddress) {
  const neighbors = new Set();
  for (const pool of pools) {
    if (pool.tokenA.address === tokenAddress) neighbors.add(pool.tokenB.address);
    if (pool.tokenB.address === tokenAddress) neighbors.add(pool.tokenA.address);
  }
  return Array.from(neighbors);
}

function buildPaths(route) {
  const hops = [];
  for (let i = 0; i < route.length - 1; i++) {
    hops.push([route[i], route[i + 1]]);
  }
  return hops;
}

module.exports = { buildRoute, buildPaths };
