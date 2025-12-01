// aliveAIController.js
require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

const RPC = process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
const web3 = new Web3(new Web3.providers.HttpProvider(RPC));

// ---------- KEYS / ADDR ----------
const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
if (!AI_PRIVATE_KEY) console.error('❌ AI_MINTER_PRIVATE_KEY missing from env!');

// derive account & add to wallet properly
let fromAddr = null;
try {
  const account = web3.eth.accounts.privateKeyToAccount(AI_PRIVATE_KEY || '');
  web3.eth.accounts.wallet.add(account);
  fromAddr = account.address;
} catch (e) {
  console.warn('⚠️ could not create account from AI_PRIVATE_KEY:', e.message);
  fromAddr = process.env.ALIVEAI_WALLET || null;
}
if (!fromAddr) console.warn('⚠️ fromAddr not set — transactions will likely fail.');

// ---------- GAS SETTINGS ----------
/**
 * Requested manual gas price: 0.142 gwei
 * web3.utils.toWei accepts 'gwei'
 */
const CUSTOM_GAS_PRICE_WEI = web3.utils.toWei('0.142', 'gwei'); // string in wei

// ---------- ABIs & UTIL ----------
const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const EmotionalBase_ABI = require(path.join(__dirname, '../abi/DRT_EmotionalBase_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const ERC20_ABI = require(path.join(__dirname, '../abi/ERC20_abi.json')); // include a standard ERC20 ABI in repo
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

// Save incoming user messages to a local log (contract doesn't accept free-text)
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

// Fourier placeholder for frontend charting
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

// helper to parse ThoughtGenerated event from receipt (if emitted)
function parseThoughtEvent(receipt) {
  try {
    if (!receipt || !receipt.events) return null;
    const evt = receipt.events['ThoughtGenerated'] || receipt.events['0'];
    if (evt && evt.returnValues) return evt.returnValues;
    // fallback iterate
    for (const k of Object.keys(receipt.events || {})) {
      if (receipt.events[k] && receipt.events[k].returnValues) {
        if (k === 'ThoughtGenerated') return receipt.events[k].returnValues;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// safe gas estimator (fallback to defaultGas if estimate fails)
async function safeSend(method, opts = {}, defaultGas = 300000) {
  const sendOpts = Object.assign({}, opts);
  try {
    if (!sendOpts.gas) {
      const gasEstimate = await method.estimateGas({ from: sendOpts.from });
      sendOpts.gas = Math.max(gasEstimate + Math.floor(gasEstimate * 0.2), defaultGas);
    }
  } catch (e) {
    sendOpts.gas = defaultGas;
  }
  // ensure gasPrice present
  if (!sendOpts.gasPrice) sendOpts.gasPrice = CUSTOM_GAS_PRICE_WEI;
  return method.send(sendOpts);
}

// check & approve ERC20 if necessary (approve router to spend token on behalf of fromAddr)
async function ensureApproved(tokenAddr, ownerAddr, spenderAddr, minAmount) {
  try {
    const erc = new web3.eth.Contract(ERC20_ABI, tokenAddr);
    const allowance = await erc.methods.allowance(ownerAddr, spenderAddr).call();
    if (web3.utils.toBN(allowance).gte(web3.utils.toBN(minAmount))) return null; // already approved
    // send approve tx
    const approveTx = await safeSend(erc.methods.approve(spenderAddr, minAmount), {
      from: ownerAddr
    }, 100000);
    return approveTx;
  } catch (e) {
    throw new Error(`approve failed: ${e.message || String(e)}`);
  }
}

// ---------- MAIN CYCLE ----------
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', cognition = '', axis = 'DRTv21', amount = 1, tokenSwapOut = 'DRTv22' } = inputData;
    logUserMessage(stimulus);

    const txHashes = [];

    // ---------- 1) submitThought() (no args in your contract)
    // Solidity submitThought() has no params per your contract, so call with none.
    const submitMethod = AliveAI.methods.submitThought();
    const tx1 = await safeSend(submitMethod, { from: fromAddr }, 300000);
    txHashes.push(tx1.transactionHash);
    const evt1 = parseThoughtEvent(tx1);
    let E_afterSubmit = evt1?.E || null;
    let status_afterSubmit = evt1?.status || null;

    // If event wasn't emitted, try viewE fallback
    if (E_afterSubmit == null) {
      try {
        const v = await AliveAI.methods.viewE().call();
        E_afterSubmit = v[0];
        status_afterSubmit = v[1];
      } catch (e) {
        // ignore, will continue
      }
    }

    // ---------- 2) Mint emotional token (call EmotionalBase.mint(tokenAddress, amount) )
    if (!tokens[axis]) throw new Error(`Unknown axis token: ${axis}`);
    // attempt mint via EmotionalBase contract; some ABIs differ — try mint(token,amount) or mint(amount,token)
    let mintTx;
    try {
      mintTx = await safeSend(EmotionalBase.methods.mint(tokens[axis], amount), { from: fromAddr }, 300000);
    } catch (e1) {
      // try alternate param order (just in case)
      try {
        mintTx = await safeSend(EmotionalBase.methods.mint(amount, tokens[axis]), { from: fromAddr }, 300000);
      } catch (e2) {
        throw new Error('Mint failed: ' + (e1.message || e1) + ' | ' + (e2.message || e2));
      }
    }
    txHashes.push(mintTx.transactionHash);

    // ---------- 3) Approve router to spend minted token (ERC20 approve) if needed
    // We will attempt to approve Router for amountIn (full balance) to avoid swap revert.
    const tokenAddr = tokens[axis];
    const erc20 = new web3.eth.Contract(ERC20_ABI, tokenAddr);
    const balanceOfOwner = await erc20.methods.balanceOf(fromAddr).call();
    const minAmountToSpend = balanceOfOwner || web3.utils.toBN(amount).toString();

    // If allowance insufficient, send approve
    const allowance = await erc20.methods.allowance(fromAddr, contracts.Router).call();
    if (web3.utils.toBN(allowance).lt(web3.utils.toBN(minAmountToSpend))) {
      const approveTx = await safeSend(erc20.methods.approve(contracts.Router, minAmountToSpend), { from: fromAddr }, 100000);
      txHashes.push(approveTx.transactionHash); // include approve tx hash
    }

    // ---------- 4) Swap token using router
    // Build path using uniswapVSPath utility — ensure it returns token-addresses array
    const pathEncoded = uniswapVSPath(tokens[axis], tokens[tokenSwapOut]);
    // fetch amountIn from EmotionalBase.balanceOf(tokenAddr, fromAddr) or ERC20 balance
    let amountIn = '0';
    try {
      // Prefer EmotionalBase.balanceOf if that returns token balance mapping
      amountIn = await EmotionalBase.methods.balanceOf(tokens[axis], fromAddr).call();
    } catch (e) {
      // fallback to ERC20 balanceOf
      amountIn = await erc20.methods.balanceOf(fromAddr).call();
    }

    if (web3.utils.toBN(amountIn).isZero()) {
      // nothing to swap — warn and skip swap
      console.warn('No token balance to swap; skipping swap.');
    } else {
      // call router swapExactTokensForTokens(amountIn, 0, path, to, deadline)
      const swapMethod = Router.methods.swapExactTokensForTokens(
        amountIn,
        0,
        pathEncoded,
        fromAddr,
        Math.floor(Date.now() / 1000) + 120
      );
      const tx3 = await safeSend(swapMethod, { from: fromAddr }, 500000);
      txHashes.push(tx3.transactionHash);
    }

    // ---------- 5) Update affective state on AliveAI (use updateAffective if present)
    // compute minimal primary/opposing or call updateAffectiveState if ABI has it
    const bals = {};
    for (const tokKey of Object.keys(tokens)) {
      try {
        bals[tokKey] = await EmotionalBase.methods.balanceOf(tokens[tokKey], contracts.AliveAI).call();
      } catch (e) {
        try { // fallback to ERC20
          const erc = new web3.eth.Contract(ERC20_ABI, tokens[tokKey]);
          bals[tokKey] = await erc.methods.balanceOf(contracts.AliveAI).call();
        } catch (e2) {
          bals[tokKey] = '0';
        }
      }
    }

    // detect which update function exists on ABI
    const hasUpdateAffective = !!AliveAI.methods.updateAffective;
    const hasUpdateAffectiveState = !!AliveAI.methods.updateAffectiveState;

    let tx4;
    if (hasUpdateAffective && typeof AliveAI.methods.updateAffective === 'function') {
      // simple heuristic: sum odd/even tokens
      const keys = Object.keys(tokens);
      let primary = web3.utils.toBN('0'), opposing = web3.utils.toBN('0');
      for (let i = 0; i < keys.length; i += 2) primary = primary.add(web3.utils.toBN(bals[keys[i]] || '0'));
      for (let i = 1; i < keys.length; i += 2) opposing = opposing.add(web3.utils.toBN(bals[keys[i]] || '0'));
      tx4 = await safeSend(AliveAI.methods.updateAffective(primary.toString(), opposing.toString()), { from: fromAddr }, 400000);
    } else if (hasUpdateAffectiveState && typeof AliveAI.methods.updateAffectiveState === 'function') {
      tx4 = await safeSend(AliveAI.methods.updateAffectiveState(
        bals.DRTv21, bals.DRTv22, bals.DRTv23, bals.DRTv24,
        bals.DRTv25, bals.DRTv26, bals.DRTv27, bals.DRTv28,
        bals.DRTv29, bals.DRTv30, bals.DRTv31, bals.DRTv32,
        bals.DRTv33, bals.DRTv34, bals.DRTv35, bals.DRTv36
      ), { from: fromAddr }, 700000);
    } else {
      throw new Error('No updateAffective/updateAffectiveState method found on AliveAI contract ABI.');
    }
    if (tx4 && tx4.transactionHash) txHashes.push(tx4.transactionHash);

    // ---------- 6) Finalize: fetch current E & status
    let E_final = null, status_final = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_final = view[0];
      status_final = view[1];
    } catch (e) {
      console.warn('viewE failed:', e.message || e);
    }

    if (E_final != null) { last10E.push(E_final); if (last10E.length > 10) last10E.shift(); }
    lastFourier = computeFourier(E_final);

    return {
      E: E_final,
      status: status_final,
      last10E,
      txHashes, // includes approve tx if it was necessary
      balances: bals,
      fourier: lastFourier
    };

  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    // Surface the most useful message
    throw new Error(err.message || String(err));
  }
}

function getLastFourier() { return lastFourier || computeFourier(null); }

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
