// routes/DMOSroute.js
const express = require("express");
const { mintDigitized, creditRebate, claimRebate } = require("../controllers/DMOScontroller");

const router = express.Router();

// Mint digitized tokens
router.post("/mint", async (req, res) => {
  try {
    const { to, amount } = req.body;
    const receipt = await mintDigitized(to, amount);
    res.json({ status: "ok", txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Credit rebate
router.post("/credit-rebate", async (req, res) => {
  try {
    const { collector, amount } = req.body;
    const receipt = await creditRebate(collector, amount);
    res.json({ status: "ok", txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Claim rebate
router.post("/claim", async (req, res) => {
  try {
    const receipt = await claimRebate();
    res.json({ status: "ok", txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

export default router;
