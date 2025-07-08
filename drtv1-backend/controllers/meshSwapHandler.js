const { ethers } = require("ethers");
const Web3 = require("web3");
const { abi: v2RouterAbi } = require("../abis/IUniswapV2Router02.json");
const { abi: v3RouterAbi } = require("../abis/ISwapRouterV3.json");

const INFURA_URL = process.env.INFURA_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const V2_ROUTER_ADDRESS = process.env.V2_ROUTER;
const V3_ROUTER_ADDRESS = process.env.V3_ROUTER;

const web3 = new Web3(new Web3.providers.HttpProvider(INFURA_URL));
const wallet = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(wallet);

const v2Router = new web3.eth.Contract(v2RouterAbi, V2_ROUTER_ADDRESS);
const v3Router = new web3.eth.Contract(v3RouterAbi, V3_ROUTER_ADDRESS);

// Helper: encode V3 path (addresses + fee tiers)
function encodeV3Path(tokens, fees) {
  if (tokens.length !== fees.length + 1) throw new Error("V3 path error");
  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    path += tokens[i].slice(2).padStart(40, "0");
    path += fees[i].toString(16).padStart(6, "0");
  }
  path += tokens[tokens.length - 1].slice(2).padStart(40, "0");
  return path.toLowerCase();
}

exports.meshSwap = async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, paths, v3Fees = [] } = req.body;
    const from = wallet.address;
    const amountInWei = web3.utils.toWei(amountIn.toString(), "ether");

    // Approve tokenIn to router
    const tokenContract = new web3.eth.Contract([
      { "constant": false, "inputs": [
        { "name": "_spender", "type": "address" },
        { "name": "_value", "type": "uint256" }
      ], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
    ], tokenIn);

    await tokenContract.methods.approve(V2_ROUTER_ADDRESS, amountInWei).send({ from, gas: 100000 });

    // Decide swap path type
    if (paths.length === 1 && v3Fees.length > 0) {
      // V3 swap
      const encodedPath = encodeV3Path(paths[0], v3Fees);
      const tx = await v3Router.methods.exactInput({
        path: encodedPath,
        recipient: from,
        deadline: Math.floor(Date.now() / 1000) + 600,
        amountIn: amountInWei,
        amountOutMinimum: 0
      }).send({ from, gas: 500000 });

      return res.json({ success: true, type: "v3", txHash: tx.transactionHash });
    } else {
      // V2 swap
      const path = paths[0];
      const tx = await v2Router.methods.swapExactTokensForTokens(
        amountInWei,
        0,
        path,
        from,
        Math.floor(Date.now() / 1000) + 600
      ).send({ from, gas: 300000 });

      return res.json({ success: true, type: "v2", txHash: tx.transactionHash });
    }

  } catch (err) {
    console.error("Mesh Swap Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
