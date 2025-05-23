require("dotenv").config();
const { ethers } = require("ethers");
const vaultAbi = require("../abi/DRTVaultV3_abi.json");

// Ensure environment variables are loaded properly
if (!process.env.MAINNET_RPC_URL || !process.env.MINTER_PRIVATE_KEY || !process.env.VAULT_ADDRESS) {
  throw new Error("Missing required environment variables: MAINNET_RPC_URL, MINTER_PRIVATE_KEY, or VAULT_ADDRESS");
}

// Create provider and signer
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const signer = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

// Connect to the Vault contract with the signer
const vault = new ethers.Contract(process.env.VAULT_ADDRESS, vaultAbi, signer);

module.exports = {
  provider,
  signer,
  vault,
  ethers,
};
