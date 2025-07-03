// drtv1-backend/controllers/meshSwapController.js
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load DRTUniversalRouterV2 ABI
const routerAbi = require("../abi/DRTUniversalRouterv2_abi.json");

// Load environment variables
const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const routerAddress = process.env.DRT_ROUTER_ADDRESS;

const contract = new ethers.Contract(routerAddress, routerAbi, wallet);

exports.meshSwap = async (req, res) => {
  const { tokenIn, tokenOut, amountIn, paths } = req.body;
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now

  if (!tokenIn || !tokenOut || !amountIn || !paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: "Missing required fields or invalid paths" });
  }

  try {
    const tokenContract = new ethers.Contract(tokenIn, ["function approve(address,uint256) public returns (bool)", "function allowance(address,address) view returns (uint256)", "function balanceOf(address) view returns (uint256)", "function transferFrom(address,address,uint256) public returns (bool)"], wallet);

    // Approve router to spend tokens if not already approved
    const allowance = await tokenContract.allowance(wallet.address, routerAddress);
    if (allowance.lt(ethers.utils.parseUnits(amountIn.toString(), 18))) {
      const tx = await tokenContract.approve(routerAddress, ethers.constants.MaxUint256);
      await tx.wait();
    }

    const tx = await contract.multiHopSwap(
      tokenIn,
      tokenOut,
      ethers.utils.parseUnits(amountIn.toString(), 18),
      paths,
      deadline
    );

    const receipt = await tx.wait();
    return res.status(200).json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error("❌ meshSwap error:", err);
    return res.status(500).json({ error: "Failed to execute multi-hop swap", details: err.message });
  }
};
