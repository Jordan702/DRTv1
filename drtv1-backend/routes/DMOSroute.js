import express from "express";
import { mintDigitized, creditRebate, claimRebate } from "./DMOScontroller.js";

const router = express.Router();

// Mint digitized credits
router.post("/mint", async (req, res) => {
  try {
    const { to, amount } = req.body;
    const receipt = await mintDigitized(to, amount);
    res.json({ status: "ok", txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign rebate to a collector
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

export default router;
