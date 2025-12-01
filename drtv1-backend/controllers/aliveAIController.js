// controllers/aliveAIController.js
require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

// --------------------- CONFIG ---------------------
const RPC = process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
const web3 = new Web3(RPC);

const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
if (!AI_PRIVATE_KEY) console.error('❌ AI_MINTER_PRIVATE_KEY missing from env!');

const account = web3.eth.accounts.wallet.add(AI_PRIVATE_KEY || '0x0'); // will be signer
const fromAddr = account.address || process.env.ALIVEAI_WALLET || null;
if (!fromAddr) console.warn('⚠️ signer / fromAddr not set — transactions will likely fail.');

// Gas price — set to 0.5 gwei by request. Adjust if you need.
const CUSTOM_GAS_PRICE = web3.utils.toWei('0.5', 'gwei'); // '0.5' gwei

// --------------------- ABIs & UTIL ---------------------
// Minimal ERC20 ABI for approve/balanceOf/allowance
const ERC20_MINIMAL_ABI = [
  { "constant": false, "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
  { "constant": true,  "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" },
  { "constant": true,  "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" },
  { "constant": false, "inputs": [{ "name": "recipient", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
];

// Load full ABIs from your repo (these must match)
const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const EmotionalBase_ABI = require(path.join(__dirname, '../abi/DRT_EmotionalBase_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const uniswapVSPath = require(path.join(__dirname, '../utils/uniswapVSPath.js'));

// --------------------- CONTRACT ADDRESSES ---------------------
const contracts = {
  AliveAI: process.env.ALIVEAI_WALLET || '0x1256AbC5d67153E430649E2d623e9AC7F1898d64',
  EmotionalBase: process.env.EMOTIONAL_BASE_WALLET || '0x9Bd5e5eF7dA59168820dD3E4A39Db39FfD26489f',
  Router: process.env.DRT_UNIVERSAL_ROUTER || '0xb22AFBC7b80510b315b4dfF0157146b2174AC63E' // your DRTUniversalRouterV2
};

// --------------------- TOKENS / POOLS ---------------------
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

// --------------------- CONTRACT OBJECTS ---------------------
const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);
const EmotionalBase = new web3.eth.Contract(EmotionalBase_ABI, contracts.EmotionalBase);
const Router = new web3.eth.Contract(Router_ABI, contracts.Router);

// --------------------- LOCAL STORAGE ---------------------
let last10E = [];
let lastFourier = null;

// --------------------- HELPERS ---------------------
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

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

function findPoolByPair(tokenNameIn, tokenNameOut) {
  return pools.find(p => p.pair.includes(tokenNameIn) && p.pair.includes(tokenNameOut));
}

// parse ThoughtGenerated event from receipt
function parseThoughtEvent(receipt) {
  try {
    if (!receipt || !receipt.events) return null;
    const evt = receipt.events['ThoughtGenerated'] || null;
    if (!evt) {
      // search generically
      for (const k of Object.keys(receipt.events)) {
        if (receipt.events[k] && receipt.events[k].returnValues) {
          if (receipt.events[k].event === 'ThoughtGenerated') return receipt.events[k].returnValues;
        }
      }
      return null;
    }
    return evt.returnValues || null;
  } catch (e) {
    return null;
  }
}

// --------------------- MAIN CYCLE ---------------------
async function runProtoConsciousCycle(inputData = {}) {
  try {
    // destructure and defaults
    const {
      stimulus = '',
      cognition = '',
      axis = 'DRTv21',
      amount = 1,
      tokenSwapOut = 'DRTv22'
    } = inputData;

    // Log user message off-chain (contract.submitThought takes no text)
    logUserMessage(stimulus);

    // Basic sanity checks
    if (!tokens[axis]) throw new Error(`Unknown axis/token ${axis}`);
    if (!tokens[tokenSwapOut]) throw new Error(`Unknown swap-out token ${tokenSwapOut}`);
    if (!fromAddr) throw new Error('Signer / from address not configured');

    const txHashes = [];

    // 1) submitThought() — contract has no args (per your Solidity)
    const sendOpts1 = { from: fromAddr, gas: 300000, gasPrice: CUSTOM_GAS_PRICE };
    const tx1 = await AliveAI.methods.submitThought().send(sendOpts1);
    txHashes.push(tx1.transactionHash);

    // try to obtain E/status from emitted event or viewE fallback
    const evt1 = parseThoughtEvent(tx1);
    let E_afterSubmit = null;
    let status_afterSubmit = null;
    if (evt1) {
      E_afterSubmit = evt1.E || evt1[0] || null;
      status_afterSubmit = evt1.status || evt1[1] || null;
    } else {
      try {
        const view = await AliveAI.methods.viewE().call();
        E_afterSubmit = view[0];
        status_afterSubmit = view[1];
      } catch (e) {
        console.warn('viewE() fallback failed after submitThought:', e.message);
      }
    }

    // 2) mint emotional token on EmotionalBase
    // Note: your EmotionalBase.mint(tokenAddress, amount) is expected from earlier files
    const mintSendOpts = { from: fromAddr, gas: 300000, gasPrice: CUSTOM_GAS_PRICE };
    const tx2 = await EmotionalBase.methods.mint(tokens[axis], amount).send(mintSendOpts);
    txHashes.push(tx2.transactionHash);

    // 2a) After mint, check balance of minted token for our fromAddr (so we know amountIn)
    const tokenContract = new web3.eth.Contract(ERC20_MINIMAL_ABI, tokens[axis]);
    const amountIn = await tokenContract.methods.balanceOf(fromAddr).call();

    // 2b) Approve router to pull tokens if allowance insufficient
    const routerAddress = contracts.Router;
    const allowance = await tokenContract.methods.allowance(fromAddr, routerAddress).call();
    if (BigInt(allowance) < BigInt(amountIn)) {
      // perform approve
      const approveTx = await tokenContract.methods.approve(routerAddress, amountIn).send({
        from: fromAddr,
        gas: 100000,
        gasPrice: CUSTOM_GAS_PRICE
      });
      // push approve tx hash so frontend shows it (now we will have 5 txs but you asked to show 4 main ones;
      // we include approve but you can hide it on frontend if you want)
      txHashes.push(approveTx.transactionHash);
    }

    // 3) Call router.multiHopSwap(tokenIn, tokenOut, amountIn, paths, deadline)
    const pool = findPoolByPair(axis, tokenSwapOut);
    if (!pool) throw new Error(`No pool/path found for ${axis}/${tokenSwapOut}`);

    // multiHopSwap expects address[][] calldata (paths). We'll pass a single path: [ [tokenInAddr, tokenOutAddr] ]
    const pathArray = [ pool.path ]; // ex: [ [tokenInAddr, tokenOutAddr] ]
    const deadline = Math.floor(Date.now() / 1000) + 180; // 3 minutes

    // Build send options and call
    const tx3 = await Router.methods.multiHopSwap(
      tokens[axis],
      tokens[tokenSwapOut],
      amountIn,
      pathArray,
      deadline
    ).send({
      from: fromAddr,
      gas: 700000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx3.transactionHash);

    // 4) Update AliveAI affective state — prefer updateAffective if present (single primary/opposing),
    // otherwise updateAffectiveState(16 args) if that ABI exists.
    const bals = {};
    for (const k of Object.keys(tokens)) {
      try { bals[k] = await (new web3.eth.Contract(ERC20_MINIMAL_ABI, tokens[k])).methods.balanceOf(contracts.AliveAI).call(); }
      catch (e) { bals[k] = '0'; console.warn(`Failed to fetch balance ${k}: ${e.message}`); }
    }

    const hasUpdateAffective = typeof AliveAI.methods.updateAffective === 'function';
    const hasUpdateAffectiveState = typeof AliveAI.methods.updateAffectiveState === 'function';

    let tx4;
    if (hasUpdateAffective) {
      // heuristic primary/opposing from odd/even tokens (replace with your real mapping later)
      let primary = 0;
      let opposing = 0;
      const keys = Object.keys(tokens);
      for (let i = 0; i < keys.length; i += 2) primary += Number(bals[keys[i]] || 0);
      for (let i = 1; i < keys.length; i += 2) opposing += Number(bals[keys[i]] || 0);

      tx4 = await AliveAI.methods.updateAffective(primary, opposing).send({
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
      ).send({
        from: fromAddr,
        gas: 700000,
        gasPrice: CUSTOM_GAS_PRICE
      });
    } else {
      throw new Error('No updateAffective/updateAffectiveState method in AliveAI ABI');
    }
    txHashes.push(tx4.transactionHash);

    // Final view: try to read the latest E/status from viewE()
    let E_final = null;
    let status_final = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_final = view[0];
      status_final = view[1];
    } catch (e) {
      console.warn('viewE() failed after update:', e.message);
    }

    // Save local mirrors
    if (E_final != null) {
      last10E.push(E_final);
      if (last10E.length > 10) last10E.shift();
    }
    lastFourier = computeFourier(E_final);

    // Return structure frontend expects (txHashes likely contains approve as an extra item — handle UI if desired)
    return {
      E: E_final,
      status: status_final,
      last10E,
      txHashes,
      balances: bals,
      fourier: lastFourier
    };
  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    // surface a clear error message
    throw new Error(err.message || String(err));
  }
}

// small helper for /fourier endpoint usage
function getLastFourier() {
  return lastFourier || computeFourier(null);
}

module.exports = {
  runProtoConsciousCycle,
  last10E,
  getLastFourier
};
