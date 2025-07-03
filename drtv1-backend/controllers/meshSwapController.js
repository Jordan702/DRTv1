// drtv1-backend/controllers/meshSwapController.js
require("dotenv").config();
const { JsonRpcProvider, Wallet, Contract, parseUnits, MaxUint256 } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load DRTUniversalRouterV2 ABI
const routerAbi = require("../abi/DRTUniversalRouterv2_abi.json");

// Load environment variables
const provider = new JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new Wallet(process.env.MINTER_PRIVATE_KEY, provider);
const routerAddress = process.env.DRT_ROUTER_ADDRESS;

const contract = new Contract(routerAddress, routerAbi, wallet);

exports.meshSwap = async (req, res) => {
  const { tokenIn, tokenOut, amountIn, paths } = req.body;
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now

  if (!tokenIn || !tokenOut || !amountIn || !paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: "Missing required fields or invalid paths" });
  }

  try {
    const tokenAbi = [
      "function approve(address,uint256) public returns (bool)",
      "function allowance(address,address) view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function transferFrom(address,address,uint256) public returns (bool)"
    ];
    const tokenContract = new Contract(tokenIn, tokenAbi, wallet);

    const parsedAmount = parseUnits(amountIn.toString(), 18);
    const allowance = await tokenContract.allowance(wallet.address, routerAddress);

    // Approve router to spend tokenIn if not already approved
    if (allowance < parsedAmount) {
      const approveTx = await tokenContract.approve(routerAddress, MaxUint256);
      await approveTx.wait();
    }

    // Use provided paths (already address[][] from frontend)
    const tx = await contract.multiHopSwap(tokenIn, tokenOut, parsedAmount, paths, deadline);
    const receipt = await tx.wait();

    return res.status(200).json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error("❌ meshSwap error:", err);
    return res.status(500).json({ error: "Failed to execute multi-hop swap", details: err.message });
  }
};
