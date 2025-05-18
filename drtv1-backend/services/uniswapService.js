require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function evaluateLiquidityprompt(prompt) {
  // Ensure the user's prompt is in string format.
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
            "if the user intends to buy DRTv1, there is enough ETH (routed through WETH) available for the given DRTv1 amount; " +
            "if the user intends to sell DRTv1, there is enough DRTv1 in the pool to exchange for the equivalent ETH value. " +
            "Based on your evaluation, respond concisely with either 'proceed' if liquidity is sufficient, or 'abort' if liquidity is insufficient."
        },
        {
          role: "user",
          content: userMessage
        },
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
