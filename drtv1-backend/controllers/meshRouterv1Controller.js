const fs = require("fs");
const path = require("path");

const POOLS_FILE = path.join(__dirname, "../../pools.json");

function findOptimalPath(tokenIn, tokenOut) {
  const pools = JSON.parse(fs.readFileSync(POOLS_FILE));
  const visited = new Set();
  const queue = [[tokenIn, [], []]]; // [currentToken, path[], pools[]]

  while (queue.length > 0) {
    const [current, path, usedPools] = queue.shift();
    if (current === tokenOut) return { path, pools: usedPools };

    for (const pool of pools) {
      const tokens = [pool.tokenA.address, pool.tokenB.address];
      if (!tokens.includes(current)) continue;

      const nextToken = tokens.find((t) => t !== current);
      const poolId = pool.address;

      if (!visited.has(current + "-" + nextToken)) {
        visited.add(current + "-" + nextToken);
        queue.push([
          nextToken,
          [...path, current],
          [...usedPools, poolId],
        ]);
      }
    }
  }

  return { path: [], pools: [] }; // No route found
}

exports.getMeshRoute = (req, res) => {
  const { tokenIn, tokenOut } = req.query;

  if (!tokenIn || !tokenOut) {
    return res.status(400).json({ error: "Missing tokenIn or tokenOut" });
  }

  const { path, pools } = findOptimalPath(tokenIn, tokenOut);
  if (path.length === 0) {
    return res.status(404).json({ error: "No path found" });
  }

  res.json({ path: [...path, tokenOut], pools });
};
