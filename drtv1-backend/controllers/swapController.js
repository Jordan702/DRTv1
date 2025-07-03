// swapController.js
const express = require('express');
const Web3 = require('web3');
const fs = require('fs');
const routerAbi = require('./abi/DRTUniversalRouter_abi.json');
const pools = require('./pools.json');
const { generate30HopPath } = require('./swapRoute');

const app = express();
app.use(express.json());

const RPC = 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'; // Replace with your actual RPC
const web3 = new Web3(RPC);

const ROUTER_ADDRESS = '0xd0fdaC020eFDBC4544372EB3260Bb15CE77206Ef';
const router = new web3.eth.Contract(routerAbi, ROUTER_ADDRESS);

// Endpoint to generate and execute a 30-hop transaction
app.post('/api/execute-swap', async (req, res) => {
  const { tokenIn, tokenOut, amountInWei, userAddress } = req.body;

  try {
    if (!tokenIn || !tokenOut || !amountInWei || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hopPaths = generate30HopPath(tokenIn, tokenOut, pools);

    if (!hopPaths || hopPaths.length === 0) {
      return res.status(404).json({ error: 'No valid 30-hop path found' });
    }

    // Approve the router to spend tokenIn (assumes approval step is handled client-side or via another API)
    // Execute multi-hop transaction
    const tx = await router.methods
      .multiHopSwap(tokenIn, tokenOut, amountInWei, hopPaths, Math.floor(Date.now() / 1000) + 600)
      .send({ from: userAddress });

    return res.json({ message: 'Swap executed', txHash: tx.transactionHash });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SwapController API running on port ${PORT}`));

