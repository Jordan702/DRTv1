/// backend/listeners/autoStationListener.js
const { ethers } = require("ethers");
const { summarizeChannel, analyzeSentiment } = require("../services/autonet_ai");
require("dotenv").config();

const contractAddress = "YOUR_CONTRACT_ADDRESS";
const contractABI = require("../../contracts/AutoStation.json");
const provider = new ethers.WebSocketProvider(process.env.MAINNET_RPC_URL);
const contract = new ethers.Contract(contractAddress, contractABI, provider);

contract.on("Broadcast", async (channel, user, message) => {
  try {
    const sentiment = await analyzeSentiment(message);
    const summary = await summarizeChannel([message]);
    console.log({ channel, user, message, sentiment, summary });
  } catch (err) {
    console.error("Broadcast event error:", err);
  }
});
