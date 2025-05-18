require('dotenv').config();
const openaiModule = require("openai");

// Use a fallback in case the module uses a default export.
const Configuration = openaiModule.Configuration || (openaiModule.default && openaiModule.default.Configuration);
const OpenAIApi = openaiModule.OpenAIApi || (openaiModule.default && openaiModule.default.OpenAIApi);

if (!Configuration || !OpenAIApi) {
  throw new Error("Failed to load OpenAI Configuration or OpenAIApi constructors.");
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const evaluateLiquidity = async (liquidityData) => {
  // For Uniswap V3 pools, we pass the pool liquidity and slot0 values (sqrtPriceX96 and tick)
  const prompt = `
Given the following Uniswap V3 pool data:
- Direction: ${liquidityData.direction}
- Amount: ${liquidityData.amount}
- Pool Liquidity: ${liquidityData.liquidity}
- sqrtPriceX96: ${liquidityData.sqrtPriceX96}
- Tick: ${liquidityData.tick}

Based on this data, should the swap proceed? Respond with "proceed" or "abort".
  `;
  
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 10,
      temperature: 0,
    });

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].text.trim().toLowerCase();
    } else {
      console.error("No completion choices received.");
      return "abort";
    }
  } catch (error) {
    console.error("Error evaluating liquidity:", error);
    return "abort";
  }
};

module.exports = { evaluateLiquidity };
