require('dotenv').config();
const OpenAI = require('openai');

// Ensure API Key is loaded properly
if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ Missing OpenAI API Key! Make sure your .env file is configured.");
}

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function evaluateLiquidity(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a trader responsible for checking liquidity in the DRTv1/ETH pool. If liquidity is sufficient, execute the trade. If liquidity is insufficient, respond with 'Insufficient liquidity, please try again later.'",
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 50,
    });

    const output = completion?.choices?.[0]?.message?.content?.trim() || "Error: No response";
    console.log("✅ OpenAI Response:", output);
    return output;

  } catch (error) {
    console.error("❌ OpenAI API Error:", error);
    return "Error: Liquidity check failed.";
  }
}

module.exports = {
  evaluateLiquidity,
};
