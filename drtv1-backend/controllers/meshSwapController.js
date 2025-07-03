// File: root/drtv1-backend/controllers/meshSwapController.js

const Web3 = require("web3");
const { abi } = require("../../drtv1-frontend/abi/DRTUniversalRouter_abi.json");
require("dotenv").config();

const routerAddress = "0xd0fdaC020eFDBC4544372EB3260Bb15CE77206Ef"; // DRTUniversalRouterV2
const web3 = new Web3(process.env.INFURA_URL || process.env.RPC_URL);
const router = new web3.eth.Contract(abi, routerAddress);
const sender = process.env.OWNER_ADDRESS;
const privateKey = process.env.OWNER_PRIVATE_KEY;

exports.meshSwap = async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, paths } = req.body;
    if (!tokenIn || !tokenOut || !amountIn || !paths || paths.length < 1) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const deadline = Math.floor(Date.now() / 1000) + 600;
    const amtWei = web3.utils.toWei(amountIn.toString(), "ether");

    const approveTx = {
      from: sender,
      to: tokenIn,
      gas: 100000,
      data: web3.eth.abi.encodeFunctionCall({
        name: "approve",
        type: "function",
        inputs: [
          { name: "_spender", type: "address" },
          { name: "_value", type: "uint256" }
        ]
      }, [routerAddress, amtWei])
    };

    const signedApprove = await web3.eth.accounts.signTransaction(approveTx, privateKey);
    await web3.eth.sendSignedTransaction(signedApprove.rawTransaction);

    const swapTx = router.methods.multiHopSwap(tokenIn, tokenOut, amtWei, paths, deadline);
    const gas = await swapTx.estimateGas({ from: sender });
    const txData = {
      to: routerAddress,
      data: swapTx.encodeABI(),
      gas,
      from: sender
    };

    const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    res.status(200).json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error("❌ meshSwap error:", err);
    res.status(500).json({ error: "Swap failed", details: err.message });
  }
};
