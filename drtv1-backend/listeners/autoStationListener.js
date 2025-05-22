/// backend/listeners/autoStationListener.js
const { ethers } = require("ethers");
const { summarizeChannel, analyzeSentiment } = require("../services/autonet_ai");
require("dotenv").config();

const contractAddress = "0xc16b6aBd3082446a74dbe1F2574C10711693A9ae";
const contractABI = require("../abi/AutoStation.json");
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
