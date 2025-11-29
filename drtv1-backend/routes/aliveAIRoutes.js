// aliveAIRoutes.js

const express = require('express');
const router = express.Router();

// Import controller
const aliveAIController = require('../controllers/aliveAIController');

// Body parser middleware (if not already in your main app)
router.use(express.json());

// POST endpoint to run the proto-conscious cycle
router.post('/runCycle', async (req, res) => {
    try {
        const inputData = req.body; // expects { stimulus, cognition, axis, amount, tokenSwapOut }
        const fromAddress = inputData.fromAddress; // user or AliveAI wallet address

        if (!fromAddress) return res.status(400).json({ error: 'fromAddress required' });

        const state = await aliveAIController.runProtoConsciousCycle(inputData, fromAddress);
        return res.json({ success: true, state });
    } catch (err) {
        console.error('Error running proto-conscious cycle:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Optional: GET endpoint to fetch last 10 reflections
router.get('/reflections', (req, res) => {
    try {
        const reflections = aliveAIController.last10E || [];
        return res.json({ reflections });
    } catch (err) {
        console.error('Error fetching reflections:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
