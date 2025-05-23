// controller.js
const Web3 = require('web3');
const abi = require('./abi/DRTSwapRouter_abi.json'); // export contract ABI here

const web3 = new Web3(process.env.MAINNET_RPC_URL);
const contract = new web3.eth.Contract(abi, process.env.DRTSWAPROUTER_CONTRACT_ADDRESS);

exports.swapDRTforETH = async (req, res) => {
  try {
    const { fromV2, amountIn, amountOutMin, walletAddress } = req.body;

    const data = contract.methods.swapDRTforETH(fromV2, amountIn, amountOutMin).encodeABI();

    res.json({ to: process.env.CONTRACT_ADDRESS, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.swapETHforDRT = async (req, res) => {
  try {
    const { toV2, amountOutMin, ethValue, walletAddress } = req.body;

    const data = contract.methods.swapETHforDRT(toV2, amountOutMin).encodeABI();

    res.json({ to: process.env.CONTRACT_ADDRESS, data, value: ethValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
