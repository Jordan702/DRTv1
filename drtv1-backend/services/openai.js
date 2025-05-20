/// backend/services/openai.js
require('dotenv').config();
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateTweet(transactionData) {
  const prompt = `Write an engaging tweet summarizing this Ethereum transaction: ${JSON.stringify(transactionData)}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 50,
  });
  return response.choices[0].message.content.trim();
}

module.exports = { generateTweet };
