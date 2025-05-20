/// backend/services/autonet_ai.js
require('dotenv').config();
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function summarizeChannel(messages) {
  const prompt = `Summarize the following messages: \n${messages.join("\n")}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content.trim();
}

async function analyzeSentiment(message) {
  const prompt = `Analyze the sentiment of this message: \"${message}\"`;
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content.trim();
}

module.exports = { summarizeChannel, analyzeSentiment };
