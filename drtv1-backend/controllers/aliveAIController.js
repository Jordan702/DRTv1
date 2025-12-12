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

// --- Real deployed token addresses ---
const tokens = {
  DRTv21: '0x15E58021f6ebbbd4c774B33D98CE80eF02Ff5C4A', // Happiness
  DRTv22: '0x07dD5fa304549F23AC46A378C9DD3Ee567352aDF', // Sadness
  DRTv23: '0xa5eE2a011FD35F001297C4e8e2FBbDB7b7b6D21F', // Fear
  DRTv24: '0x250B92B7915ff8B91Ce7B99e82D278103b115ff3', // Trust
  DRTv25: '0x97309DD6b0C4C7e9ab9D8331F92A7a915aAf47dA', // Anger
  DRTv26: '0x1Fe183dE675f3FC9Ca77FaAB2cAEcD6149e7B205', // Peace
  DRTv27: '0x60B772bcc8f328B139C791A997b94eC75A42E26E', // Disgust
  DRTv28: '0x11eaA5C548E828927d7C8c9b4d0E1790c755b3e7', // Admiration
  DRTv29: '0xAB32e2D0AB54e4EF5eFB9e4738A39AbA87F456DE', // Surprise
  DRTv30: '0xb35Ef74d028db89Bb9b8672ccF79CB118b1548C4', // Anticipation
  DRTv31: '0xab726a64A0d20fCa1fA0244F44393f48403514D0', // Joy
  DRTv32: '0x51dcaF84638adb96604e4498A182f9DE0c9A9b65', // Contempt
  DRTv33: '0x2F55607b752fE96Dc9d0B87d3c76BB8731FE3cfD', // Shame
  DRTv34: '0x954ecf0055ED3615f0B05a89150dFA3E9e939dc9', // Pride
  DRTv35: '0x0EfA645239541b67128109E70Ae997A9b60be18F', // Courage
  DRTv36: '0x6aACE21EeDD11B48A8f833a7A6593ed23985Ecfc'  // Cowardness
};

// --- Corresponding emotion pools ---
const pools = {
  DRTv21: { tokenOut: 'DRTv22', pool: '0xebC808634e03a9D66398B5A1db27EA1835C178e1' },
  DRTv23: { tokenOut: 'DRTv24', pool: '0xd69358B7a9cD85a1935232867AA943901b9B367D' },
  DRTv25: { tokenOut: 'DRTv26', pool: '0xbBbaE20A212Fa9d83624fe759Efb5DA705e185FA' },
  DRTv27: { tokenOut: 'DRTv28', pool: '0x3798Aae2e0a6a4aa33cf8153b03b0dd7bcdc123e' },
  DRTv29: { tokenOut: 'DRTv30', pool: '0x960E41760e6a0Cc19950FC636506169A92ea3331' },
  DRTv31: { tokenOut: 'DRTv32', pool: '0x6db7B0Cba818fEb9d26F9f49A9c059B6ad040cF5' },
  DRTv33: { tokenOut: 'DRTv34', pool: '0xD1254d6e8A159630640f9a40291c8B4038d5C6Ed' },
  DRTv35: { tokenOut: 'DRTv36', pool: '0xFc3C470aF05034e5834CF8dC6939Af1619a2fD7F' }
};

const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);
let last10E = [];
let lastFourier = null;

// --- Helper functions ---
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
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

// --- Main cycle ---
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', amount = 1 } = inputData;
    logUserMessage(stimulus);

    let axis = 'DRTv21'; // default
    const text = String(stimulus).toLowerCase();
    for (const [label, tok] of Object.entries(tokens)) {
      if (text.includes(label.replace('DRTv', ''))) { axis = label; break; }
    }

    console.log(`Axis token: ${axis}`);
    const tx1 = await AliveAI.methods.submitThought().send({ from: fromAddr, gas: 300000, gasPrice: CUSTOM_GAS_PRICE });
    const tokenInstance = new web3.eth.Contract(ERC20_ABI, tokens[axis]);
    const tx2 = await tokenInstance.methods.mint(fromAddr, amount).send({ from: fromAddr, gas: 300000, gasPrice: CUSTOM_GAS_PRICE });

    const balance = await tokenInstance.methods.balanceOf(fromAddr).call();
    const allowance = await tokenInstance.methods.allowance(fromAddr, contracts.Router).call();
    if (web3.utils.toBN(allowance).lt(web3.utils.toBN(balance))) {
      await tokenInstance.methods.approve(contracts.Router, MAX_UINT_256).send({ from: fromAddr, gas: 100000, gasPrice: CUSTOM_GAS_PRICE });
    }

    const swapInfo = pools[axis];
    let tx3;
    let tokenOut = null;
    if (swapInfo) {
      tokenOut = swapInfo.tokenOut;
      const Router = new web3.eth.Contract(Router_ABI, contracts.Router);
      tx3 = await Router.methods.multiHopSwap(tokens[axis], tokens[tokenOut], balance, [[tokens[axis], tokens[tokenOut]]], Math.floor(Date.now()/1000)+120)
        .send({ from: fromAddr, gas: 500000, gasPrice: CUSTOM_GAS_PRICE });
    }

    const bals = {};
    for (const tokKey of Object.keys(tokens)) {
      const inst = new web3.eth.Contract(ERC20_ABI, tokens[tokKey]);
      bals[tokKey] = await inst.methods.balanceOf(fromAddr).call();
    }

    let tx4;
    if (axis==='DRTv21'||axis==='DRTv22') tx4 = await AliveAI.methods.updateAffective(bals.DRTv21,bals.DRTv22).send({ from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE });
    else if (axis==='DRTv23'||axis==='DRTv24') tx4 = await AliveAI.methods.updateCognitive(bals.DRTv23,bals.DRTv24).send({ from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE });
    else if (axis==='DRTv25'||axis==='DRTv26') tx4 = await AliveAI.methods.updateSocial(bals.DRTv25,bals.DRTv26).send({ from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE });
    else tx4 = await AliveAI.methods.updateAffective(bals.DRTv21,bals.DRTv22).send({ from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE });

    let E_val = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_val = parseFloat(web3.utils.fromWei(view[0],'ether'));
      last10E.push(E_val);
      if (last10E.length>10) last10E.shift();
    } catch {}

    lastFourier = computeFourier(last10E);

    const message = [
      `Thought submitted (tx: ${tx1.transactionHash})`,
      `Minted ${amount} of ${axis} (tx: ${tx2.transactionHash})`,
      swapInfo ? `Swapped ${balance} of ${axis} for ${tokenOut} (tx: ${tx3.transactionHash})` : 'No swap performed',
      `Updated system state (tx: ${tx4.transactionHash})`,
      E_val!==null?`Final emotional state E=${E_val} (${E_val>=0?'positive':'negative'})`:'E unavailable'
    ].join('. ')+'.';

    console.log("Cycle summary:", message);
    return { E: E_val, last10E, txHashes: [tx1.transactionHash, tx2.transactionHash, tx3?.transactionHash, tx4.transactionHash], balances: bals, fourier: lastFourier, message };
  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    throw err;
  }
}

function getLastFourier() { 
  return lastFourier || computeFourier([]); 
}

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
