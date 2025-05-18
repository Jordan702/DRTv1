require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function evaluateResourcePrompt(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a strict financial evaluator for the DRTv1 protocol. Return only a single number (no words, no symbols, no commentary). The number must represent the estimated USD value of the submission. Do not include any explanation.",
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 50,
    });

    const output = completion?.choices?.[0]?.message?.content || '';
    console.log("✅ OpenAI responded:", output.trim());
    return output;

  } catch (error) {
    console.error("❌ OpenAI API error:", error.message || error);
    return null;
  }
}
module.exports = {
  evaluateResourcePrompt,
};
