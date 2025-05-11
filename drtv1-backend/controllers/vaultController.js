const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load ABIs
const vaultAbi = require("../abi/Vault.json");

// Setup provider and signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Connect to Vault contract
const vaultAddress = process.env.VAULT_CONTRACT_ADDRESS;
const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, signer);

exports.handleDRTPurchase = async (req, res) => {
  const { buyer, drtTokenAddress, amountETH } = req.body;
  try {
    const tx = await vaultContract.handleDRTPurchase(
      buyer,
      drtTokenAddress,
      { value: ethers.parseEther(amountETH.toString()) }
    );
    await tx.wait();

    res.json({ message: "DRT purchase handled successfully", txHash: tx.hash });
  } catch (err) {
    console.error("❌ Purchase error:", err);
    res.status(500).json({ error: "Purchase failed" });
  }
};

exports.redeemSETH = async (req, res) => {
  const { wallet, amount } = req.body;
  const logPath = path.resolve(__dirname, '../logs/redemptions.json');

  try {
    const tx = await vaultContract.redeemSETH(wallet, ethers.parseUnits(amount.toString(), 18));
    await tx.wait();

    const logEntry = {
      wallet,
      amount,
      txHash: tx.hash,
      timestamp: new Date().toISOString()
    };

    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath));
    }

    logs.push(logEntry);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

    res.json({ message: "sETH redeemed successfully", txHash: tx.hash });

  } catch (err) {
    console.error("❌ Redemption error:", err);

    const errorLog = {
      wallet,
      amount,
      error: err.message,
      timestamp: new Date().toISOString()
    };

    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath));
    }

    logs.push(errorLog);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

    res.status(500).json({ error: "Redemption failed" });
  }
};
