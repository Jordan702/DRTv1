require('dotenv').config({ path: './.env' });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require("ethers");

// Connect to Ethereum provider (Infura, Alchemy, or local node)
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);

// Replace with your DRTv1 contract address and ABI
const contractAddress = "0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1";
const contractAbi = require('../DRT_abi.json'); // Ensure this is your ABI

const contract = new ethers.Contract(contractAddress, contractAbi, provider);

const getTransactions = async (req, res) => {
  try {
    const filter = contract.filters.Transfer(); // All Transfer events
    const events = await contract.queryFilter(filter, -2000); // Query last 2000 blocks

    const recentTransfers = events
      .slice(-25) // Get last 25
      .reverse()
      .map((event) => ({
        from: event.args.from,
        to: event.args.to,
        amount: ethers.formatUnits(event.args.value, 18),
        timestamp: null, // To be filled in next step
        txHash: event.transactionHash
      }));

    // Populate timestamp for each transaction
    await Promise.all(
      recentTransfers.map(async (tx) => {
        const block = await provider.getBlock(tx.txHash);
        tx.timestamp = new Date(block.timestamp * 1000).toISOString();
      })
    );

    res.json(recentTransfers);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

module.exports = { getTransactions };
