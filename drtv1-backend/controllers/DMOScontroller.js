// controllers/DMOScontroller.js
const { ethers } = require("ethers");
require("dotenv").config();

const digitizeAbi = require("../abi/Digitize_abi.json");
const vaultAbi = require("../abi/Vault_abi.json");

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

const digitize = new ethers.Contract(process.env.DIGITIZE_ADDR, digitizeAbi, wallet);
const vault = new ethers.Contract(process.env.VAULT_ADDR, vaultAbi, wallet);

module.exports = {
  mintDigitized: async (to, amount) => {
    const tx = await digitize.mint(to, amount);
    return await tx.wait();
  },
  creditRebate: async (collector, amount) => {
    const tx = await vault.creditRebate(collector, amount);
    return await tx.wait();
  },
  claimRebate: async () => {
    const tx = await vault.claimRebate();
    return await tx.wait();
  }
};
