// SPDX-License-Identifier: MIT
const { ethers } = require("ethers");
const DRTv1_ABI = require("../abis/DRTv1.json"); // your DRTv1 ABI

// Set up provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract instance
const drtv1 = new ethers.Contract(process.env.DRTV1_ADDRESS, DRTv1_ABI, wallet);

async function mintTokens(req, res) {
    try {
        const { recipient, amount } = req.body;

        if (!recipient || !amount) {
            return res.status(400).json({ error: "recipient and amount required" });
        }

        // Convert amount to BigNumber (18 decimals)
        const mintAmount = ethers.parseUnits(amount.toString(), 18);

        // Call mint() on the contract
        const tx = await drtv1.mint(recipient, mintAmount);
        await tx.wait();

        return res.status(200).json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
    mintTokens,
};
