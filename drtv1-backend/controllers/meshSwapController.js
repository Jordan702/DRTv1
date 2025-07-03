const Web3 = require("web3");
const fs = require("fs");
const path = require("path");

// Load ABI and setup web3 + contract instance
const ABI_PATH = path.join(__dirname, "../abi/DRTUniversalRouter_abi.json");
const ABI = JSON.parse(fs.readFileSync(ABI_PATH));
const ROUTER_ADDRESS = "0xd0fdaC020eFDBC4544372EB3260Bb15CE77206Ef"; // Your deployed router
const web3 = new Web3(process.env.INFURA_URL); // or your preferred provider (Infura, Alchemy, or local)

const router = new web3.eth.Contract(ABI, ROUTER_ADDRESS);

const meshSwapHandler = async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, paths, userAddress } = req.body;

    if (!tokenIn || !tokenOut || !amountIn || !paths || !userAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const amountWei = web3.utils.toWei(amountIn.toString(), "ether");

    const tx = router.methods.multiHopSwap(tokenIn, tokenOut, amountWei, paths, Math.floor(Date.now() / 1000) + 1800);

    const gas = await tx.estimateGas({ from: userAddress });
    const txData = tx.encodeABI();

    return res.json({
      success: true,
      message: "Ready to sign and send",
      data: {
        to: ROUTER_ADDRESS,
        data: txData,
        gas,
        from: userAddress,
      },
    });
  } catch (err) {
    console.error("❌ meshSwap error:", err);
    return res.status(500).json({ error: "meshSwap failed", details: err.message });
  }
};

module.exports = meshSwapHandler;
