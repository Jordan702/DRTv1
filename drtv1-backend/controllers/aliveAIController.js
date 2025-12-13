require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

const MAX_UINT_256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const web3 = new Web3(process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY');

const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
if (!AI_PRIVATE_KEY) console.error('❌ AI_MINTER_PRIVATE_KEY missing from env!');

const signer = web3.eth.accounts.wallet.add(AI_PRIVATE_KEY || '0x0');
const fromAddr = signer.address || null;
if (!fromAddr) console.warn('⚠️ signer / fromAddr not set — transactions will likely fail.');

const CUSTOM_GAS_PRICE = web3.utils.toWei('0.75', 'gwei');

const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const ERC20_ABI = require(path.join(__dirname, '../abi/DRTv15_abi.json')); // Mintable ERC20 ABI

const contracts = {
  AliveAI: process.env.ALIVEAI_CONTRACT_ADDRESS || '0x1256AbC5d67153E430649E2d623e9AC7F1898d64',
  Router: process.env.DRT_UNIVERSAL_ROUTER || '0xb22AFBC7b80510b315b4dfF0157146b2174AC63E'
};

const tokens = {
  DRTv21: '0x15E58021f6ebbbd4c774B33D98CE80eF02Ff5C4A',
  DRTv22: '0x07dD5fa304549F23AC46A378C9DD3Ee567352aDF',
  DRTv23: '0xa5eE2a011FD35F001297C4e8e2FBbDB7b7b6D21F',
  DRTv24: '0x250B92B7915ff8B91Ce7B99e82D278103b115ff3',
  DRTv25: '0x97309DD6b0C4C7e9ab9D8331F92A7a915aAf47dA',
  DRTv26: '0x1Fe183dE675f3FC9Ca77FaAB2cAEcD6149e7B205',
  DRTv27: '0x60B772bcc8f328B139C791A997b94eC75A42E26E',
  DRTv28: '0x11eaA5C548E828927d7C8c9b4d0E1790c755b3e7',
  DRTv29: '0xAB32e2D0AB54e4EF5eFB9e4738A39AbA87F456DE',
  DRTv30: '0xb35Ef74d028db89Bb9b8672ccF79CB118b1548C4',
  DRTv31: '0xab726a64A0d20fCa1fA0244F44393f48403514D0',
  DRTv32: '0x51dcaF84638adb96604e4498A182f9DE0c9A9b65',
  DRTv33: '0x2F55607b752fE96Dc9d0B87d3c76BB8731FE3cfD',
  DRTv34: '0x954ecf0055ED3615f0B05a89150dFA3E9e939dc9',
  DRTv35: '0x0EfA645239541b67128109E70Ae997A9b60be18F',
  DRTv36: '0x6aACE21EeDD11B48A8f833a7A6593ed23985Ecfc'
};

const pools = [
  { pair: ['DRTv21', 'DRTv22'], path: [tokens.DRTv21, tokens.DRTv22] },
  { pair: ['DRTv23', 'DRTv24'], path: [tokens.DRTv23, tokens.DRTv24] },
  { pair: ['DRTv25', 'DRTv26'], path: [tokens.DRTv25, tokens.DRTv26] },
  { pair: ['DRTv27', 'DRTv28'], path: [tokens.DRTv27, tokens.DRTv28] },
  { pair: ['DRTv29', 'DRTv30'], path: [tokens.DRTv29, tokens.DRTv30] },
  { pair: ['DRTv31', 'DRTv32'], path: [tokens.DRTv31, tokens.DRTv32] },
  { pair: ['DRTv33', 'DRTv34'], path: [tokens.DRTv33, tokens.DRTv34] },
  { pair: ['DRTv35', 'DRTv36'], path: [tokens.DRTv35, tokens.DRTv36] }
];

const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);

let last10E = [];
let lastFourier = null;

// Log each user message
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

// Simple DFT
function computeFourier(data) {
  const N = data.length;
  if (N < 2) return { frequencies: [], real: [], imag: [], magnitudes: [] };
  const result = { frequencies: [], real: [], imag: [], magnitudes: [] };
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      re += data[n] * Math.cos(angle);
      im += data[n] * Math.sin(angle);
    }
    result.frequencies.push(k);
    result.real.push(re);
    result.imag.push(im);
    result.magnitudes.push(Math.sqrt(re*re + im*im));
  }
  return result;
}

// ---------------- MAIN FUNCTION ----------------
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', amount = 1 } = inputData;
    logUserMessage(stimulus);

    // ---------------- AXIS SELECTION ----------------
    const text = String(stimulus || '').toLowerCase();
    let axis = null;

    const axisKeywords = {
      DRTv23: /\b(trust|faith|loyalty|sure|certain)\b/,
      DRTv24: /\b(fear|afraid|scared|panic|worried)\b/,
      DRTv25: /\b(anger|angry|mad|furious|rage)\b/,
      DRTv26: /\b(peace|calm|serene|tranquil)\b/,
      DRTv27: /\b(disgust|gross|nasty|repulsed)\b/,
      DRTv28: /\b(admire|esteem|respect|appreciate)\b/,
      DRTv29: /\b(surprise|astonish|amazed|startled)\b/,
      DRTv30: /\b(anticipate|expect|eager|anticipating)\b/,
      DRTv31: /\b(excited|thrilled|ecstatic)\b/,
      DRTv32: /\b(contempt|scorn|scornful)\b/,
      DRTv33: /\b(shame|guilty|embarrassed)\b/,
      DRTv34: /\b(pride|dignity|honor|vain)\b/,
      DRTv35: /\b(courage|brave|fearless)\b/,
      DRTv36: /\b(coward|cowardice|fearful)\b/
    };

    for (const [tok, regex] of Object.entries(axisKeywords)) {
      if (text.match(regex)) {
        axis = tok;
        break;
      }
    }

    // Fallback positive/negative
    if (!axis) {
      if (text.match(/\b(happy|good|glad|joy|pleasure|delight|love|like|optimistic|cheerful)\b/)) axis = 'DRTv21';
      else if (text.match(/\b(sad|bad|down|depress|unhappy|sorrow|cry|hate|lonely)\b/)) axis = 'DRTv22';
      else axis = null; // truly neutral
    }

    // ---------------- THOUGHT SUBMISSION ----------------
    let txHashes = [];
    if (axis) {
      console.log(`Submitting thought to AliveAI (contract: ${contracts.AliveAI})`);
      const tx1 = await AliveAI.methods.submitThought().send({
        from: fromAddr,
        gas: 300000,
        gasPrice: CUSTOM_GAS_PRICE
      });
      txHashes.push(tx1.transactionHash);
    }

    // ---------------- MINT TOKEN ----------------
    let tokenSwapOut = null;
    if (axis) {
      const tokenInstance = new web3.eth.Contract(ERC20_ABI, tokens[axis]);
      console.log(`Minting ${amount} of token ${axis} to ${fromAddr}`);
      const tx2 = await tokenInstance.methods.mint(fromAddr, amount).send({
        from: fromAddr,
        gas: 300000,
        gasPrice: CUSTOM_GAS_PRICE
      });
      txHashes.push(tx2.transactionHash);

      // ---------------- APPROVE ROUTER ----------------
      const balance = await tokenInstance.methods.balanceOf(fromAddr).call();
      const currentAllowance = await tokenInstance.methods.allowance(fromAddr, contracts.Router).call();
      if (web3.utils.toBN(currentAllowance).lt(web3.utils.toBN(balance))) {
        console.log("Approving Router to spend tokens...");
        await tokenInstance.methods.approve(contracts.Router, MAX_UINT_256).send({
          from: fromAddr,
          gas: 100000,
          gasPrice: CUSTOM_GAS_PRICE
        });
      }

      // ---------------- MULTIHOP SWAP ----------------
      const pool = pools.find(p => p.pair.includes(axis));
      if (pool) {
        tokenSwapOut = (pool.pair[0] === axis ? pool.pair[1] : pool.pair[0]);
        console.log(`Swapping ${balance} of ${axis} to ${tokenSwapOut}`);
        const Router = new web3.eth.Contract(Router_ABI, contracts.Router);
        const tx3 = await Router.methods.multiHopSwap(
          tokens[axis],
          tokens[tokenSwapOut],
          balance,
          [pool.path],
          Math.floor(Date.now() / 1000) + 120
        ).send({
          from: fromAddr,
          gas: 500000,
          gasPrice: CUSTOM_GAS_PRICE
        });
        txHashes.push(tx3.transactionHash);
      }
    }

    // ---------------- UPDATE STATE ----------------
    const bals = {};
    for (const tokKey of Object.keys(tokens)) {
      try {
        const inst = new web3.eth.Contract(ERC20_ABI, tokens[tokKey]);
        bals[tokKey] = await inst.methods.balanceOf(fromAddr).call();
      } catch {
        bals[tokKey] = '0';
      }
    }

    let tx4;
    if (axis === 'DRTv21' || axis === 'DRTv22') {
      tx4 = await AliveAI.methods.updateAffective(bals.DRTv21, bals.DRTv22).send({
        from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE
      });
    } else if (axis === 'DRTv23' || axis === 'DRTv24') {
      tx4 = await AliveAI.methods.updateCognitive(bals.DRTv23, bals.DRTv24).send({
        from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE
      });
    } else if (axis === 'DRTv25' || axis === 'DRTv26') {
      tx4 = await AliveAI.methods.updateSocial(bals.DRTv25, bals.DRTv26).send({
        from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE
      });
    } else {
      tx4 = await AliveAI.methods.updateAffective(bals.DRTv21, bals.DRTv22).send({
        from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE
      });
    }
    txHashes.push(tx4.transactionHash);

    // ---------------- COMPUTE EMOTIONAL STATE ----------------
    let E_final = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_final = view[0];
    } catch { E_final = null; }

    let E_val = null;
    if (E_final) {
      try { E_val = parseFloat(web3.utils.fromWei(E_final, 'ether')); } catch { E_val = E_final; }
      last10E.push(E_val);
      if (last10E.length > 10) last10E.shift();
    }
    lastFourier = computeFourier(last10E);

    // ---------------- PLAIN ENGLISH RESPONSE ----------------
    const axisFeelings = {
      DRTv21: "happy",
      DRTv22: "sad",
      DRTv23: "trustful",
      DRTv24: "fearful",
      DRTv25: "angry",
      DRTv26: "peaceful",
      DRTv27: "disgusted",
      DRTv28: "admiring",
      DRTv29: "surprised",
      DRTv30: "anticipating",
      DRTv31: "excited",
      DRTv32: "contemptuous",
      DRTv33: "ashamed",
      DRTv34: "proud",
      DRTv35: "courageous",
      DRTv36: "fearful/cowardly"
    };

    const feeling = axis ? axisFeelings[axis] || "neutral" : "neutral";
    let responseMessage = `After reading your message, I felt ${feeling}. `;

    if(axis){
      responseMessage += `I minted ${amount} ${axis} token${amount>1?'s':''}`;
      if(tokenSwapOut) responseMessage += ` and swapped some for ${tokenSwapOut}`;
      responseMessage += `. `;
    }

    if(E_val !== null){
      const overallMood = E_val >= 0 ? "slightly positive" : "slightly negative";
      responseMessage += `Overall, my emotional state is ${overallMood}.`;
    }

    console.log("AliveAI response:", responseMessage);

    return {
      E: E_val,
      last10E,
      txHashes,
      balances: bals,
      fourier: lastFourier,
      message: responseMessage
    };

  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    throw err;
  }
}

function getLastFourier() { 
  return lastFourier || computeFourier([]); 
}

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
