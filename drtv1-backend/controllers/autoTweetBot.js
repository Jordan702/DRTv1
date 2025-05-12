require('dotenv').config({ path: './.env' });
const { ethers } = require('ethers');
const Twitter = require('twitter-v2'); // install via: npm i twitter-v2

✅ autoTweetBot.js (core logic only, minimal but production-ready)
const provider = new ethers.WebSocketProvider(process.env.ALCHEMY_WSS);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = '0xYourAutoTweetAddress';
const abi = [  // minimal ABI
  "event TweetQueued(string message, uint256 timestamp)",
  "function confirm(string msg_, string txRef) external"
];
const contract = new ethers.Contract(contractAddress, abi, wallet);

const twitter = new Twitter({
  access_token_key: process.env.TWITTER_TOKEN,
  access_token_secret: process.env.TWITTER_SECRET,
  bearer_token: process.env.TWITTER_BEARER,
});

contract.on('TweetQueued', async (msg, ts) => {
  console.log(`📡 TweetQueued: ${msg}`);
  try {
    const res = await twitter.post('tweets', { text: msg });
    const tweetId = res?.data?.id;
    console.log(`✅ Tweet sent: https://twitter.com/yourhandle/status/${tweetId}`);
    await contract.confirm(msg, tweetId.toString());
  } catch (e) {
    console.error('❌ Tweet failed:', e);
  }
});
