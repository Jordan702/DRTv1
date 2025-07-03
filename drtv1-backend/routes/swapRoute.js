// swapRoute.js
const fs = require('fs');
const path = require('path');

const poolsFile = path.join(__dirname, 'pools.json');
const pools = JSON.parse(fs.readFileSync(poolsFile));

function generate30HopPath(tokenIn, tokenOut) {
  const path = [];
  const availableTokens = new Set();
  pools.forEach(pool => {
    availableTokens.add(pool.tokenA.address);
    availableTokens.add(pool.tokenB.address);
  });

  // Early exit if tokens are invalid
  if (!availableTokens.has(tokenIn) || !availableTokens.has(tokenOut)) {
    throw new Error("Token not part of any pool");
  }

  // Build path starting from tokenIn through unique tokens
  let current = tokenIn;
  const visited = new Set();
  path.push(current);
  visited.add(current);

  for (let i = 0; i < 28; i++) {
    let next = null;
    for (const pool of pools) {
      if (pool.tokenA.address === current && !visited.has(pool.tokenB.address)) {
        next = pool.tokenB.address;
        break;
      } else if (pool.tokenB.address === current && !visited.has(pool.tokenA.address)) {
        next = pool.tokenA.address;
        break;
      }
    }
    if (!next) break;
    path.push(next);
    visited.add(next);
    current = next;
  }

  // End on tokenOut if not already there
  if (current !== tokenOut) {
    path.push(tokenOut);
  }

  return path;
}

module.exports = { generate30HopPath };
