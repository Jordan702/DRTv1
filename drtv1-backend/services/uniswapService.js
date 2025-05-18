// evaluateLiquidity.js
require('dotenv').config();
const OpenAI = require('openai');

// Ensure the API key is available
if (!process.env.OPENAI_API_KEY) {
  throw new Error('❌ Missing OPENAI_API_KEY! Check your .env configuration.');
}

// Initialize OpenAI client (SDK v4+)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evaluate liquidity in the DRTv1/ETH pool via an OpenAI chat prompt.
 *
 * @param {string} prompt - A user‑defined prompt describing the desired trade.
 * @returns {Promise<string>} - The model’s response (or an error message).
 */
async function evaluateLiquidity(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a trader responsible for checking liquidity in the DRTv1/ETH pool. ' +
            "If liquidity is sufficient, execute the trade. If liquidity is insufficient, respond with 'Insufficient liquidity, please try again later.'",
        },
        {
          role: 'user',
          content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
        },
      ],
      temperature: 0.2,
      max_tokens: 50,
    });

    if (completion.choices?.length) {
      const output = completion.choices[0].message.content.trim();
      console.log('✅ OpenAI Response:', output);
      return output;
    }

    console.error('❌ No choices returned from OpenAI API.');
    return 'Error: No response from OpenAI API.';
  } catch (error) {
    console.error('❌ OpenAI API Error:', error);
    return 'Error: Liquidity check failed.';
  }
}
module.exports = { evaluateLiquidity };
