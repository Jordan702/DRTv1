// Uniswap V3 Path Utility for encoding paths
const { ethers } = require("ethers");

// Encodes a path for Uniswap V3 swaps: [token0, fee0, token1, fee1, ..., tokenN]
function encodeV3Path(pathArray) {
  if (pathArray.length < 2 || pathArray.length % 2 === 0) {
    throw new Error("Invalid V3 path format. Use: [token0, fee0, token1, fee1, ..., tokenN]");
  }

  let encoded = "0x";
  for (let i = 0; i < pathArray.length - 1; i += 2) {
    const token = pathArray[i];
    const fee = parseInt(pathArray[i + 1]);
    if (!ethers.utils.isAddress(token)) throw new Error("Invalid token address: " + token);
    if (fee < 0 || fee > 1e6) throw new Error("Invalid fee tier: " + fee);

    encoded += token.slice(2).toLowerCase(); // remove '0x' from token
    encoded += fee.toString(16).padStart(6, "0"); // 3 bytes
  }

  const lastToken = pathArray[pathArray.length - 1];
  if (!ethers.utils.isAddress(lastToken)) throw new Error("Invalid last token address: " + lastToken);
  encoded += lastToken.slice(2).toLowerCase();

  return encoded;
}

module.exports = { encodeV3Path };
