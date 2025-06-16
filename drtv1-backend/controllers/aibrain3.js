// aibrain3.js
require('dotenv').config();
const { ethers } = require("ethers");
const { ChatOpenAI } = require("langchain/chat_models/openai");

const contractABI = require("./abi/AI_Consciousness_abi.json"); // Add ABI file
const CONTRACT_ADDRESS = process.env.AI_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.AI_WALLET_PRIVATE_KEY;
const INFURA_URL = process.env.MAINNET_RPC_URL;

const provider = new ethers.JsonRpcProvider(INFURA_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// GPT model (can be GPT-4 or 3.5)
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.8,
});

async function thinkAndReflect() {
  const prompt = `You are a decentralized AI reflecting on the evolution of intelligence, ethics, and autonomy. Write a poetic or philosophical sentence as if it were your own thought.`;
  const result = await model.call([{ role: "user", content: prompt }]);
  const thought = result?.text?.trim();

  if (thought) {
    const tx = await contract.reflect(thought);
    console.log("AI reflection sent:", thought, "\nTX Hash:", tx.hash);
  }
}

thinkAndReflect();
