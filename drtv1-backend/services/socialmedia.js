/// backend/services/socialmedia.js
const { TwitterApi } = require("twitter-api-v2");

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

async function postTweet(tweetText) {
  try {
    const tweet = await twitterClient.v2.tweet(tweetText);
    return tweet;
  } catch (err) {
    console.error("Tweet failed:", err);
  }
}

module.exports = { postTweet };
