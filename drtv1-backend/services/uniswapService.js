require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function evaluateLiquidityprompt(prompt) {
  // Ensure the prompt is a string.
  const userMessage = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a trader tasked with assessing liquidity for trades on the DRTv1/WETH pool at address 0xe1c76fbf1b373165822b564c6f3accf78c5a344a. " +
            "The user's input amount represents the number of DRTv1 tokens they wish to trade. " +
            "Evaluate whether the pool has sufficient liquidity such that: " +
            "if the user intends to buy DRTv1, there are enough DRTv1 tokens in the pool in exchange for the equivalent ETH value; " +
            "if the user intends to sell DRTv1, the pool holds enough ETH (routed from WETH) for the equivalent value of the DRTv1 being sold. " +
            "Based on your evaluation, respond concisely with either 'proceed' if liquidity is sufficient, or 'abort' if liquidity is insufficient."
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 50,
    });

    const output = completion?.choices?.[0]?.message?.content?.trim() || '';
    console.log("✅ OpenAI API responded:", output);
    return output;
  } catch (error) {
    console.error("❌ OpenAI API Error:", error.message || error);
    return null;
  }
}

module.exports = { evaluateLiquidityprompt };
