require("dotenv").config();
const { ethers } = require('ethers');
const vaultAbi = require('../abi/DRTVaultV3_abi.json');

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const signer = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

const vault = new ethers.Contract(process.env.VAULT_ADDRESS, vaultAbi, signer);

module.exports = { provider, signer, vault, ethers };
