// aliveAIRoutes.js

const express = require('express');
const router = express.Router();
const aliveAIController = require('../controllers/aliveAIController');
const { ethers } = require('ethers');

// Body parser middleware (if not already in main app)
router.use(express.json());

// Load wallet from .env
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = process.env.MINTER_PRIVATE_KEY
    ? new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider)
    : null;

// POST endpoint to run the proto-conscious cycle
router.post('/runCycle', async (req, res) => {
    try {
        const inputData = req.body; // expects { stimulus, cognition, axis, amount, tokenSwapOut }
        let fromAddress = inputData.fromAddress;

        if (!fromAddress) {
            if (!wallet) return res.status(400).json({ error: 'No fromAddress provided and MINTER_PRIVATE_KEY not set' });
            fromAddress = wallet.address; // default to .env wallet
        }

        const state = await aliveAIController.runProtoConsciousCycle(inputData, fromAddress);
        return res.json({ success: true, state });
    } catch (err) {
        console.error('Error running proto-conscious cycle:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// GET endpoint to fetch last 10 reflections
router.get('/reflections', (req, res) => {
    try {
        const reflections = aliveAIController.last10E || [];
        return res.json({ success: true, reflections });
    } catch (err) {
        console.error('Error fetching reflections:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
