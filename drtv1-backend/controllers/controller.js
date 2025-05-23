require('dotenv').config({ path: './.env' });
const Web3 = require('web3');
const abi = require('./abi/DRTSwapRouter_abi.json');

const web3 = new Web3(process.env.MAINNET_RPC_URL);
const contract = new web3.eth.Contract(abi, process.env.DRTSWAPROUTER_CONTRACT_ADDRESS);

exports.swapDRTforETH = async (req, res) => {
  try {
    const { fromV2, amountIn, amountOutMin, walletAddress } = req.body;

    console.log(`[DRT ➡ ETH] Request from ${walletAddress} | fromV2: ${fromV2}, amountIn: ${amountIn}, minOut: ${amountOutMin}`);

    if (!walletAddress || !amountIn || !amountOutMin) {
      console.warn('❌ Missing required fields in swapDRTforETH');
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const data = contract.methods
      .swapDRTforETH(fromV2, amountIn, amountOutMin)
      .encodeABI();

    console.log(`✅ Encoded swapDRTforETH tx: ${data.substring(0, 20)}...`);

    res.json({
      to: process.env.DRTSWAPROUTER_CONTRACT_ADDRESS,
      data,
      from: walletAddress,
      status: 'ReadyToSign',
      message: 'DRT to ETH swap encoded. Please sign with your wallet.',
    });
  } catch (err) {
    console.error('❌ swapDRTforETH failed:', err);
    res.status(500).json({ error: 'Swap encoding failed', details: err.message });
  }
};

exports.swapETHforDRT = async (req, res) => {
  try {
    const { toV2, amountOutMin, ethValue, walletAddress } = req.body;

    console.log(`[ETH ➡ DRT] Request from ${walletAddress} | toV2: ${toV2}, ethValue: ${ethValue}, minOut: ${amountOutMin}`);

    if (!walletAddress || !ethValue || !amountOutMin) {
      console.warn('❌ Missing required fields in swapETHforDRT');
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const data = contract.methods
      .swapETHforDRT(toV2, amountOutMin)
      .encodeABI();

    console.log(`✅ Encoded swapETHforDRT tx: ${data.substring(0, 20)}...`);

    res.json({
      to: process.env.DRTSWAPROUTER_CONTRACT_ADDRESS,
      data,
      from: walletAddress,
      value: ethValue,
      status: 'ReadyToSign',
      message: 'ETH to DRT swap encoded. Please sign with your wallet.',
    });
  } catch (err) {
    console.error('❌ swapETHforDRT failed:', err);
    res.status(500).json({ error: 'Swap encoding failed', details: err.message });
  }
};
