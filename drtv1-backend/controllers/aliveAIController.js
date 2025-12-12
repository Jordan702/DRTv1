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
const ERC20_ABI = require(path.join(__dirname, '../abi/DRTv15_abi.json'));

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

// Emotional pairs & pools mapping
const emotionPairs = {
  DRTv21: { opposite: 'DRTv22', pool: '0xebC808634e03a9D66398B5A1db27EA1835C178e1' },
  DRTv22: { opposite: 'DRTv21', pool: '0xebC808634e03a9D66398B5A1db27EA1835C178e1' },
  DRTv23: { opposite: 'DRTv24', pool: '0xd69358B7a9cD85a1935232867AA943901b9B367D' },
  DRTv24: { opposite: 'DRTv23', pool: '0xd69358B7a9cD85a1935232867AA943901b9B367D' },
  DRTv25: { opposite: 'DRTv26', pool: '0xbBbaE20A212Fa9d83624fe759Efb5DA705e185FA' },
  DRTv26: { opposite: 'DRTv25', pool: '0xbBbaE20A212Fa9d83624fe759Efb5DA705e185FA' },
  DRTv27: { opposite: 'DRTv28', pool: '0x3798Aae2e0a6a4aa33cf8153b03b0dd7bcdc123e' },
  DRTv28: { opposite: 'DRTv27', pool: '0x3798Aae2e0a6a4aa33cf8153b03b0dd7bcdc123e' },
  DRTv29: { opposite: 'DRTv30', pool: '0x960E41760e6a0Cc19950FC636506169A92ea3331' },
  DRTv30: { opposite: 'DRTv29', pool: '0x960E41760e6a0Cc19950FC636506169A92ea3331' },
  DRTv31: { opposite: 'DRTv32', pool: '0x6db7B0Cba818fEb9d26F9f49A9c059B6ad040cF5' },
  DRTv32: { opposite: 'DRTv31', pool: '0x6db7B0Cba818fEb9d26F9f49A9c059B6ad040cF5' },
  DRTv33: { opposite: 'DRTv34', pool: '0xD1254d6e8A159630640f9a40291c8B4038d5C6Ed' },
  DRTv34: { opposite: 'DRTv33', pool: '0xD1254d6e8A159630640f9a40291c8B4038d5C6Ed' },
  DRTv35: { opposite: 'DRTv36', pool: '0xFc3C470aF05034e5834CF8dC6939Af1619a2fD7F' },
  DRTv36: { opposite: 'DRTv35', pool: '0xFc3C470aF05034e5834CF8dC6939Af1619a2fD7F' },
};

const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);

let last10E = [];
let lastFourier = null;

// Log each user message for audit
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

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

// Main cycle
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', amount = 1 } = inputData;
    logUserMessage(stimulus);

    // ---------- Determine AI Emotion ----------
    const text = String(stimulus || '').toLowerCase();
    let axis = null;
    // Emotion keyword mapping (simplified)
    const emotionMap = {
      trust: 'DRTv24', fear: 'DRTv23', anger: 'DRTv25', peace: 'DRTv26',
      disgust: 'DRTv27', admiration: 'DRTv28', surprise: 'DRTv29', anticipation: 'DRTv30',
      joy: 'DRTv31', contempt: 'DRTv32', shame: 'DRTv33', pride: 'DRTv34',
      courage: 'DRTv35', coward: 'DRTv36', happy: 'DRTv21', sad: 'DRTv22'
    };

    for (const [key, val] of Object.entries(emotionMap)) {
      if (text.includes(key)) { axis = val; break; }
    }
    if (!axis) axis = 'DRTv21'; // fallback happy

    const pairInfo = emotionPairs[axis];

    // ---------- Mint Emotion Token ----------
    const tokenInstance = new web3.eth.Contract(ERC20_ABI, tokens[axis]);
    console.log(`Minting ${amount} of ${axis}`);
    const txMint = await tokenInstance.methods.mint(fromAddr, amount).send({ from: fromAddr, gas: 300_000, gasPrice: CUSTOM_GAS_PRICE });

    // ---------- Swap to Opposite Token via Pool ----------
    const Router = new web3.eth.Contract(Router_ABI, contracts.Router);
    const balance = await tokenInstance.methods.balanceOf(fromAddr).call();

    const oppToken = pairInfo.opposite;
    console.log(`Swapping ${balance} of ${axis} → ${oppToken} via pool ${pairInfo.pool}`);
    const txSwap = await Router.methods.multiHopSwap(
      tokens[axis],
      tokens[oppToken],
      balance,
      [[tokens[axis], tokens[oppToken]]],
      Math.floor(Date.now()/1000)+600
    ).send({ from: fromAddr, gas: 500_000, gasPrice: CUSTOM_GAS_PRICE });

    // ---------- Update AI State ----------
    const balances = {};
    for (const tokKey of Object.keys(tokens)) {
      try {
        balances[tokKey] = await new web3.eth.Contract(ERC20_ABI, tokens[tokKey]).methods.balanceOf(fromAddr).call();
      } catch { balances[tokKey] = '0'; }
    }

    let txUpdate;
    if (axis === 'DRTv21' || axis === 'DRTv22') txUpdate = await AliveAI.methods.updateAffective(balances.DRTv21, balances.DRTv22).send({ from: fromAddr, gas: 200_000, gasPrice: CUSTOM_GAS_PRICE });
    else if (axis === 'DRTv23' || axis === 'DRTv24') txUpdate = await AliveAI.methods.updateCognitive(balances.DRTv23, balances.DRTv24).send({ from: fromAddr, gas: 200_000, gasPrice: CUSTOM_GAS_PRICE });
    else if (axis === 'DRTv25' || axis === 'DRTv26') txUpdate = await AliveAI.methods.updateSocial(balances.DRTv25, balances.DRTv26).send({ from: fromAddr, gas: 200_000, gasPrice: CUSTOM_GAS_PRICE });
    else txUpdate = await AliveAI.methods.updateAffective(balances.DRTv21, balances.DRTv22).send({ from: fromAddr, gas: 200_000, gasPrice: CUSTOM_GAS_PRICE });

    // ---------- Compile Human-Readable Message ----------
    let E_final = null;
    try { E_final = parseFloat(web3.utils.fromWei((await AliveAI.methods.viewE().call())[0], 'ether')); } catch {}
    last10E.push(E_final); if (last10E.length>10) last10E.shift();
    lastFourier = computeFourier(last10E);

    const status = E_final>=0?'positive':'negative';
    const message = `AI felt ${axis}, minted ${amount}, swapped to ${oppToken}. Final emotional state E=${E_final} (${status}).`;
    console.log("Cycle summary:", message);

    return { E: E_final, last10E, balances, fourier: lastFourier, message, txs: { mint: txMint.transactionHash, swap: txSwap.transactionHash, update: txUpdate.transactionHash } };

  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    throw err;
  }
}

function getLastFourier() { return lastFourier || computeFourier([]); }

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
