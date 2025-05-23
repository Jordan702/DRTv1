require('dotenv').config();
const { ethers, provider } = require('../utils/web3');
const tokenAbi = require('../abi/ERC20.json'); // Standard ERC20 ABI

const sETH = new ethers.Contract(process.env.SETH_ADDRESS, tokenAbi, provider);
const dRTv1 = new ethers.Contract(process.env.DRTV1_ADDRESS, tokenAbi, provider);
const dRTv2 = new ethers.Contract(process.env.DRTV2_ADDRESS, tokenAbi, provider);

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
