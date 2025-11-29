// aliveAIRoutes.js

const express = require('express');
const router = express.Router();
const aliveAIController = require('../controllers/aliveAIController');

// Body parser middleware (if not already in main app)
router.use(express.json());

// POST endpoint to run the proto-conscious cycle
router.post('/runCycle', async (req, res) => {
    try {
        const inputData = req.body; // expects { stimulus, cognition, axis, amount, tokenSwapOut }

        // Get AliveAI wallet from req set in index.js
        const wallet = req.aliveAIWallet;
        if (!wallet) return res.status(500).json({ error: 'AliveAI wallet not configured' });

        const state = await aliveAIController.runProtoConsciousCycle(inputData, wallet);

        // Return full state including last10E, balances, Fourier, and 4 transaction hashes
        return res.json({
            success: true,
            state: {
                E: state.E,
                last10E: state.last10E,
                balances: state.balances,
                fourier: state.fourier,
                txHashes: state.txHashes // 4 txs: user message, mint, swap, AliveAI response
            }
        });
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
