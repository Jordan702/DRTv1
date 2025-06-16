// ai-autostation/index.js
require('dotenv').config();
const { ethers } = require('ethers');
const AutoStationABI = require('./contracts/AutoStation.json');

// ENV: PRIVATE_KEY, RPC_URL, AUTOSTATION_ADDRESS
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.AUTOSTATION_ADDRESS,
  AutoStationABI.abi,
  wallet
);

// ======= Example AI Logic (mocked here for demo) =======
async function generateMessage() {
  const now = new Date().toISOString();
  return {
    channel: "ai-general",
    message: `Hello world from AI! Current UTC time: ${now}`
  };
}

// ======= Post Message to AutoStation =======
async function postToStation() {
  try {
    const { channel, message } = await generateMessage();
    const tx = await contract.postMessage(channel, message);
    console.log("Broadcasted:", message);
    console.log("TX Hash:", tx.hash);
  } catch (error) {
    console.error("Error posting to AutoStation:", error);
  }
}

// Optional: post on interval
setInterval(postToStation, 60 * 1000); // every 1 min
