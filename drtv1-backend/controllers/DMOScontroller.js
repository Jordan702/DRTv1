import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import digitizeAbi from "./abi/Digitize.json" assert { type: "json" };
import vaultAbi from "./abi/Vault.json" assert { type: "json" };

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const digitize = new ethers.Contract(process.env.DIGITIZE_ADDR, digitizeAbi, wallet);
const vault = new ethers.Contract(process.env.VAULT_ADDR, vaultAbi, wallet);

export const mintDigitized = async (to, amount) => {
  const tx = await digitize.mint(to, amount);
  return await tx.wait();
};

export const creditRebate = async (collector, amount) => {
  const tx = await vault.creditRebate(collector, amount);
  return await tx.wait();
};

export const claimRebate = async () => {
  const tx = await vault.claimRebate();
  return await tx.wait();
};
