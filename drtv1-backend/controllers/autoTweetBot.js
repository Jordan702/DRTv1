const { ethers } = require("ethers");
const { TwitterApi } = require("twitter-api-v2");
require("dotenv").config();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;

const abi = ["event Tweet(string message)"];
const contract = new ethers.Contract(contractAddress, abi, provider);

contract.on("Tweet", async (message) => {
  const tweet = message.trim().slice(0, 280); // Safe tweet length
  try {
    const { data } = await twitterClient.v2.tweet(tweet);
    console.log("✅ Tweet posted:", data.id);
  } catch (err) {
    console.error("❌ Failed to tweet:", err);
  }
});
