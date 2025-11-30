// aliveAIController.js
require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

// ---------- WEB3 + SIGNER ----------
const web3 = new Web3(process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY');

const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
if (!AI_PRIVATE_KEY) console.error('❌ AI_MINTER_PRIVATE_KEY missing from env!');

const signer = web3.eth.accounts.wallet.add(AI_PRIVATE_KEY || '0x0'); 
const fromAddr = signer.address || process.env.ALIVEAI_WALLET || null;
if (!fromAddr) console.warn('⚠️ signer / fromAddr not set — transactions will likely fail.');

// ---------- GAS SETTINGS ----------
const CUSTOM_GAS_PRICE = web3.utils.toWei('0.142', 'gwei'); // ultra cheap mainnet

// ---------- ABIs & UTILS ----------
const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const EmotionalBase_ABI = require(path.join(__dirname, '../abi/DRT_EmotionalBase_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const uniswapVSPath = require(path.join(__dirname, '../utils/uniswapVSPath.js'));

// ---------- CONTRACT ADDRESSES ----------
const contracts = {
  AliveAI: process.env.ALIVEAI_WALLET || '0x1256AbC5d67153E430649E2d623e9AC7F1898d64',
  EmotionalBase: process.env.EMOTIONAL_BASE_WALLET || '0x9Bd5e5eF7dA59168820dD3E4A39Db39FfD26489f',
  Router: process.env.DRT_UNIVERSAL_ROUTER || '0xb22AFBC7b80510b315b4dfF0157146b2174AC63E'
};

// ---------- TOKENS & POOLS ----------
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
  { pair: ['DRTv21', 'DRTv22'], address: '0xebC808634e03a9D66398B5A1db27EA1835C178e1' },
  { pair: ['DRTv23', 'DRTv24'], address: '0xd69358B7a9cD85a1935232867AA943901b9B367D' },
  { pair: ['DRTv25', 'DRTv26'], address: '0xbBbaE20A212Fa9d83624fe759Efb5DA705e185FA' },
  { pair: ['DRTv27', 'DRTv28'], address: '0x3798Aae2e0a6a4aa33cf8153b03b0dd7bcdc123e' },
  { pair: ['DRTv29', 'DRTv30'], address: '0x960E41760e6a0Cc19950FC636506169A92ea3331' },
  { pair: ['DRTv31', 'DRTv32'], address: '0x6db7B0Cba818fEb9d26F9f49A9c059B6ad040cF5' },
  { pair: ['DRTv33', 'DRTv34'], address: '0xD1254d6e8A159630640f9a40291c8B4038d5C6Ed' },
  { pair: ['DRTv35', 'DRTv36'], address: '0xFc3C470aF05034e5834CF8dC6939Af1619a2fD7F' }
];

// ---------- CONTRACT INSTANCES ----------
const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);
const EmotionalBase = new web3.eth.Contract(EmotionalBase_ABI, contracts.EmotionalBase);
const Router = new web3.eth.Contract(Router_ABI, contracts.Router);

// ---------- LOCAL STORAGE ----------
let last10E = [];
let lastFourier = null;

// Log user messages off-chain
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

// Fourier placeholder for charting
function computeFourier(E) {
  return {
    timestamps: [Date.now()],
    S: [Math.random()],
    C: [Math.random()],
    W: [Math.random()],
    T: [Math.random()],
    F: [Math.random()],
    R: [Math.random()],
    E
  };
}

// Parse ThoughtGenerated event
function parseThoughtEvent(receipt) {
  try {
    if (!receipt || !receipt.events) return null;
    const evt = receipt.events['ThoughtGenerated'] || receipt.events['0'];
    if (!evt) {
      for (const k of Object.keys(receipt.events)) {
        if (k === 'ThoughtGenerated') return receipt.events[k].returnValues;
      }
      return null;
    }
    return evt.returnValues || null;
  } catch (e) {
    return null;
  }
}

// MAIN PROTO-CONSCIOUS CYCLE
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', cognition = '', axis = 'DRTv21', amount = 1, tokenSwapOut = 'DRTv22' } = inputData;
    logUserMessage(stimulus);

    const txHashes = [];

    // 1) submitThought
    const tx1 = await AliveAI.methods.submitThought().send({
      from: fromAddr,
      gas: 300000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx1.transactionHash);
    const evt1 = parseThoughtEvent(tx1);
    let E_afterSubmit = evt1?.E || null;
    let status_afterSubmit = evt1?.status || null;

    // 2) mint emotional token
    const tx2 = await EmotionalBase.methods.mint(tokens[axis], amount).send({
      from: fromAddr,
      gas: 300000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx2.transactionHash);

    // 3) swap token
    const pool = pools.find(p => p.pair.includes(axis) && p.pair.includes(tokenSwapOut));
    if (!pool) throw new Error(`No pool found for ${axis}/${tokenSwapOut}`);
    const pathEncoded = uniswapVSPath(tokens[axis], tokens[tokenSwapOut]);
    const amountIn = await EmotionalBase.methods.balanceOf(tokens[axis], fromAddr).call();

    const tx3 = await Router.methods.swapExactTokensForTokens(
      amountIn, 0, pathEncoded, fromAddr, Math.floor(Date.now()/1000)+120
    ).send({
      from: fromAddr,
      gas: 400000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx3.transactionHash);

    // 4) updateAffectiveState
    const bals = {};
    for (const tokKey of Object.keys(tokens)) {
      try { bals[tokKey] = await EmotionalBase.methods.balanceOf(tokens[tokKey], contracts.AliveAI).call(); }
      catch (e) { bals[tokKey] = '0'; console.warn(`Failed to fetch balance for ${tokKey}:`, e.message); }
    }

    const hasUpdateAffective = typeof AliveAI.methods.updateAffective === 'function';
    const hasUpdateAffectiveState = typeof AliveAI.methods.updateAffectiveState === 'function';
    let tx4;
    if (hasUpdateAffective) {
      let primary = 0, opposing = 0;
      const keys = Object.keys(tokens);
      for (let i = 0; i < keys.length; i += 2) primary += Number(bals[keys[i]] || 0);
      for (let i = 1; i < keys.length; i += 2) opposing += Number(bals[keys[i]] || 0);
      tx4 = await AliveAI.methods.updateAffective(Math.floor(primary), Math.floor(opposing)).send({
        from: fromAddr,
        gas: 400000,
        gasPrice: CUSTOM_GAS_PRICE
      });
    } else if (hasUpdateAffectiveState) {
      tx4 = await AliveAI.methods.updateAffectiveState(
        bals.DRTv21, bals.DRTv22, bals.DRTv23, bals.DRTv24,
        bals.DRTv25, bals.DRTv26, bals.DRTv27, bals.DRTv28,
        bals.DRTv29, bals.DRTv30, bals.DRTv31, bals.DRTv32,
        bals.DRTv33, bals.DRTv34, bals.DRTv35, bals.DRTv36
      ).send({ from: fromAddr, gas: 400000, gasPrice: CUSTOM_GAS_PRICE });
    } else throw new Error('No updateAffective/updateAffectiveState method found on AliveAI contract ABI.');
    txHashes.push(tx4.transactionHash);

    // Fetch final E & status
    let E_final = null, status_final = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_final = view[0]; status_final = view[1];
    } catch (e) { console.warn('Failed to call viewE after update:', e.message); }

    if (E_final != null) { last10E.push(E_final); if (last10E.length > 10) last10E.shift(); }
    lastFourier = computeFourier(E_final);

    return { E: E_final, status: status_final, last10E, txHashes, balances: bals, fourier: lastFourier };

  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    throw new Error(err.message || String(err));
  }
}

function getLastFourier() { return lastFourier || computeFourier(null); }

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
