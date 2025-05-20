/// backend/monitor/transactionMonitor.js
const { ethers } = require("ethers");
const { generateTweet } = require("../services/openai");
const { postTweet } = require("../services/socialmedia");
require("dotenv").config();

const provider = new ethers.WebSocketProvider(process.env.WS_PROVIDER_URL);

provider.on("pending", async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (tx && tx.from.toLowerCase() === process.env.WALLET_ADDRESS.toLowerCase()) {
      const tweet = await generateTweet(tx);
      await postTweet(tweet);
      console.log(`Tweet posted for tx ${txHash}`);
    }
  } catch (error) {
    console.error("Error in transaction monitor:", error.message);
  }
});
