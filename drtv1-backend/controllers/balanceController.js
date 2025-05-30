require('dotenv').config();
const { ethers, provider } = require('../utils/web3');
const stokenAbi = require('../abi/sETH_abi.json'); // Standard ERC20 ABI
const dtokenAbi = require('../abi/DRT_abi.json'); // Standard ERC20 ABI
const ddtokenAbi = require('../abi/DRTv2_abi.json'); // Standard ERC20 ABI

const sETH = new ethers.Contract(process.env.SETH_ADDRESS, stokenAbi, provider);
const dRTv1 = new ethers.Contract(process.env.DRT_V1_CONTRACT_ADDRESS, dtokenAbi, provider);
const dRTv2 = new ethers.Contract(process.env.DRT_V2_CONTRACT_ADDRESS, ddtokenAbi, provider);

exports.getBalances = async (req, res) => {
  try {
    const user = req.params.address;

    const [ethBal, sEthBal, drt1Bal, drt2Bal] = await Promise.all([
      provider.getBalance(user),
      sETH.balanceOf(user),
      dRTv1.balanceOf(user),
      dRTv2.balanceOf(user)
    ]);

    res.json({
      success: true,
      balances: {
        eth: ethers.formatEther(ethBal),
        sETH: ethers.formatUnits(sEthBal, 18),
        dRTv1: ethers.formatUnits(drt1Bal, 18),
        dRTv2: ethers.formatUnits(drt2Bal, 18),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
