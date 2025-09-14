require("dotenv").config();
const { ethers } = require("ethers");

const DRTv1_ABI = [
  "function mint(address to, uint256 amount) external"
];

const DRTv1_ADDRESS = process.env.DRT_CONTRACT_ADDRESS; // Your DRTv1 contract address
const TOKEN_DECIMALS = 18; // Make sure to use the correct number of decimals for your token

async function mintDRTv1(req, res) {
  try {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: "Recipient address and amount are required" });
    }

    console.log(`[MintController] Preparing to mint ${amount} DRTv1 to ${recipient}...`);

    const { wallet, provider } = req;
    if (!wallet || !provider) {
      return res.status(500).json({ error: "Wallet or provider not initialized" });
    }

    // Connect to the DRTv1 contract with wallet as signer
    const contract = new ethers.Contract(DRTv1_ADDRESS, DRTv1_ABI, wallet);

    // FIX: Call parseUnits directly from the ethers object
    let mintAmount;
    try {
      mintAmount = ethers.parseUnits(amount.toString(), TOKEN_DECIMALS);
    } catch (parseErr) {
      console.error('❌ Failed to parse amount:', parseErr.message);
      return res.status(400).json({ error: 'Invalid amount format', details: 'The amount could not be converted to a valid token value.' });
    }

    let tx;
    try {
      tx = await contract.mint(recipient, mintAmount);
      await tx.wait();
      console.log(`✅ Minted successfully. TX Hash: ${tx.hash}`);
      return res.json({ txHash: tx.hash });
    } catch (mintErr) {
      console.error('❌ Minting failed:', mintErr.message);
      return res.status(500).json({ error: 'Blockchain mint failed', details: mintErr.message });
    }

  } catch (err) {
    console.error('[MintController] Unexpected error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}

module.exports = { mintDRTv1 };
