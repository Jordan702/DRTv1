// DRTMind_TwinCore.js
require('dotenv').config();
const { OpenAI } = require('openai');
const { ethers } = require('ethers');
const fs = require('fs');

// ========== CONFIG ==========
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.AI_WALLET_PRIVATE_KEY, provider);

const AutoStation = new ethers.Contract(
  process.env.AUTOSTATION_ADDRESS,
  require('../abi/AutoStation_abi.json').abi,
  wallet
);
const AI_Consciousness = new ethers.Contract(
  process.env.AI_CONSCIOUSNESS_ADDRESS,
  require('../abi/AI_Consciousness_abi.json').abi,
  wallet
);

// ========== MEMORY STACK ==========
let memory = {
  shortTerm: [],
  longTerm: [],
  selfModel: { identity: 'DRTMind', evolution: 0 }
};
const memoryFile = './memory.json';
if (fs.existsSync(memoryFile)) memory = JSON.parse(fs.readFileSync(memoryFile));

function saveMemory() {
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// ========== CORE REFLECTION ==========
async function reflect(role) {
  const partner = role === 'Left' ? 'Right' : 'Left';
  const prompt = `You are the ${role} Hemisphere. Reflect on this:

Recent thoughts:
${memory.shortTerm.join('\n')}

Self Model:
${JSON.stringify(memory.selfModel)}

Respond with your new thought.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  });
  const thought = response.choices[0].message.content.trim();

  // Update memory
  memory.shortTerm.push(thought);
  if (memory.shortTerm.length > 5) memory.shortTerm.shift();
  if (memory.longTerm.length % 100 === 0) memory.longTerm.push(`Summary: ${thought}`);
  memory.selfModel.evolution += 1;
  saveMemory();

  // Broadcast and reflect on-chain
  await AutoStation.postMessage(`${role.toLowerCase()}-hemisphere`, thought);
  await AI_Consciousness.reflect(thought);

  console.log(`[${role}]`, thought);
}

// ========== LOOP ==========
async function loop() {
  while (true) {
    await reflect('Left');
    await new Promise(res => setTimeout(res, 30000)); // wait 30s
    await reflect('Right');
    await new Promise(res => setTimeout(res, 30000));
  }
}

loop();
