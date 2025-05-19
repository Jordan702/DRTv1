const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { TwitterApi } = require("twitter-api-v2");
require("dotenv").config();

// Load ABI from correct path
const abiPath = path.resolve(__dirname, "../abi/AutoTweet_abi.json");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// Initialize Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Ethers.js setup
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

// Listen for Tweet events from AutoTweet.sol
contract.on("Tweet", async (message) => {
  const tweet = message.trim().slice(0, 280);
  console.log("📡 New on-chain message:", tweet);

  try {
    const { data } = await twitterClient.v2.tweet(tweet);
    console.log("✅ Tweeted:", data.id);
  } catch (err) {
    console.error("❌ Twitter post failed:", err);
  }
});
