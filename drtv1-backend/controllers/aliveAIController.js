// root/drtv1-backend/controllers/aliveAIController.js
require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

// ---------- CONFIG ----------
const MAX_UINT_256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const DEFAULT_RPC = 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
const web3 = new Web3(process.env.MAINNET_RPC_URL || DEFAULT_RPC);

// ---------- SIGNER ----------
const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
if (!AI_PRIVATE_KEY) console.error('❌ AI_MINTER_PRIVATE_KEY missing from .env');

const wallet = web3.eth.accounts.wallet.add(AI_PRIVATE_KEY || '0x0');
const fromAddr = wallet.address || null;
if (!fromAddr) console.warn('⚠️ signer / fromAddr not set — transactions will likely fail.');

// ---------- ABIs ----------
const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const ERC20_MINTABLE_ABI = require(path.join(__dirname, '../abi/DRTv15_abi.json')); // Use your mintable token ABI

// ---------- CONTRACT ADDRESSES (env overrides) ----------
const contracts = {
  AliveAI: process.env.ALIVEAI_CONTRACT_ADDRESS || '0x1256AbC5d67153E430649E2d623e9AC7F1898d64',
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
  { pair: ['DRTv21', 'DRTv22'], path: [tokens.DRTv21, tokens.DRTv22] },
  { pair: ['DRTv23', 'DRTv24'], path: [tokens.DRTv23, tokens.DRTv24] },
  { pair: ['DRTv25', 'DRTv26'], path: [tokens.DRTv25, tokens.DRTv26] },
  { pair: ['DRTv27', 'DRTv28'], path: [tokens.DRTv27, tokens.DRTv28] },
  { pair: ['DRTv29', 'DRTv30'], path: [tokens.DRTv29, tokens.DRTv30] },
  { pair: ['DRTv31', 'DRTv32'], path: [tokens.DRTv31, tokens.DRTv32] },
  { pair: ['DRTv33', 'DRTv34'], path: [tokens.DRTv33, tokens.DRTv34] },
  { pair: ['DRTv35', 'DRTv36'], path: [tokens.DRTv35, tokens.DRTv36] }
];

// ---------- CONTRACT INSTANCES ----------
const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);
const Router = new web3.eth.Contract(Router_ABI, contracts.Router);

// ---------- HELPERS ----------
function bn(val) { return web3.utils.toBN(val); }
const SCALE_18 = web3.utils.toBN('1000000000000000000'); // 1e18

function nowUnix() { return Math.floor(Date.now() / 1000); }

function logToFile(filename, msg) {
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'logs', filename), `${new Date().toISOString()} | ${msg}\n`);
  } catch (e) {
    console.warn('logToFile failed:', e.message);
  }
}

async function getDynamicGasPrice() {
  try {
    const gp = await web3.eth.getGasPrice(); // returns wei as string
    return gp;
  } catch (e) {
    // fallback to 1 gwei if provider hiccups
    return web3.utils.toWei('1', 'gwei');
  }
}

// small utility: accept numeric amount (like 1) and scale to 18 decimals BN
function scaleAmountDecimal18(amount) {
  // allow amount to be BN/string/number; treat as whole tokens (not wei)
  const a = web3.utils.toBN(String(amount));
  return a.mul(SCALE_18);
}

// Placeholder Fourier (same as your previous computeFourier)
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

// Log message submissions
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

// ---------- MAIN PROTO-CONSCIOUS CYCLE ----------
/**
 * inputData:
 *  - stimulus (string)   // logged off-chain
 *  - axis (string key)   // e.g. 'DRTv21'
 *  - amount (number)     // number of tokens to mint (whole tokens)
 *  - tokenSwapOut (string key) // e.g. 'DRTv22'
 */
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', axis = 'DRTv21', amount = 1, tokenSwapOut = 'DRTv22' } = inputData;
    logUserMessage(stimulus);

    // ensure token keys map to addresses
    if (!tokens[axis]) throw new Error(`Unknown token axis key: ${axis}`);
    if (!tokens[tokenSwapOut]) throw new Error(`Unknown tokenSwapOut key: ${tokenSwapOut}`);

    const txHashes = [];

    // dynamic gas price per tx
    let gasPrice;

    // ---------------- TX1: submitThought() on AliveAI ----------------
    console.log(`TX1: Sending submitThought from ${fromAddr} -> AliveAI ${contracts.AliveAI}`);
    gasPrice = await getDynamicGasPrice();
    const tx1 = await AliveAI.methods.submitThought().send({
      from: fromAddr,
      gas: 300000,
      gasPrice
    });
    txHashes.push(tx1.transactionHash);
    console.log('TX1 OK:', tx1.transactionHash);

    // ---------------- TX2: mint on the token contract ----------------
    // Use token ABI instance for the specific token (you compiled these tokens with mint() owner-only)
    const tokenAddr = tokens[axis];
    const tokenInstance = new web3.eth.Contract(ERC20_MINTABLE_ABI, tokenAddr);

    // scale amount to 18 decimals
    const amountScaled = scaleAmountDecimal18(amount);

    console.log(`TX2: Minting ${amount} (${amountScaled.toString()}) of ${axis} (${tokenAddr}) to ${fromAddr}`);
    gasPrice = await getDynamicGasPrice();

    // call owner-only mint (requires fromAddr to equal token.owner)
    const tx2 = await tokenInstance.methods.mint(fromAddr, amountScaled.toString()).send({
      from: fromAddr,
      gas: 300000,
      gasPrice
    });
    txHashes.push(tx2.transactionHash);
    console.log('TX2 OK:', tx2.transactionHash);

    // ---------------- Approve Router if needed ----------------
    gasPrice = await getDynamicGasPrice();
    const balanceAfterMint = web3.utils.toBN(await tokenInstance.methods.balanceOf(fromAddr).call());
    const allowance = web3.utils.toBN(await tokenInstance.methods.allowance(fromAddr, contracts.Router).call());

    if (allowance.lt(balanceAfterMint)) {
      console.log('Approving Router for max spend...');
      const txApprove = await tokenInstance.methods.approve(contracts.Router, MAX_UINT_256).send({
        from: fromAddr,
        gas: 120000,
        gasPrice
      });
      console.log('Approve tx:', txApprove.transactionHash);
      txHashes.push(txApprove.transactionHash); // note: this will make 5 txs if included — if you strictly want 4 txs, remove pushing approve (but it's safer to include)
      // If you want exactly 4 txs including approve as part of TX3, you can combine logic, but keeping it separate is safer.
    } else {
      console.log('Router already approved.');
    }

    // ---------------- TX3: multiHopSwap via Router ----------------
    // find pool
    const pool = pools.find(p => p.pair.includes(axis) && p.pair.includes(tokenSwapOut));
    if (!pool) throw new Error(`No pool found for ${axis}/${tokenSwapOut}`);

    // Set path as provided in pools; Router expects paths (array-of-arrays)
    const paths = [pool.path];

    // Use the amount we actually have (balanceAfterMint)
    const amountToSwap = balanceAfterMint.toString();

    console.log(`TX3: multiHopSwap ${tokenAddr} -> ${tokens[tokenSwapOut]} amount ${amountToSwap}`);
    gasPrice = await getDynamicGasPrice();

    // instantiate fresh Router instance (safety)
    const routerInstance = new web3.eth.Contract(Router_ABI, contracts.Router);

    const deadline = Math.floor(Date.now() / 1000) + 120; // +2 minutes

    const tx3 = await routerInstance.methods.multiHopSwap(
      tokenAddr,
      tokens[tokenSwapOut],
      amountToSwap,
      paths,
      deadline
    ).send({
      from: fromAddr,
      gas: 800000,
      gasPrice
    });
    txHashes.push(tx3.transactionHash);
    console.log('TX3 OK:', tx3.transactionHash);

    // ---------------- TX4: updateAffective on AliveAI ----------------
    // Gather balances of tokens as they sit in AliveAI contract address
    const bals = {};
    for (const key of Object.keys(tokens)) {
      try {
        const inst = new web3.eth.Contract(ERC20_MINTABLE_ABI, tokens[key]);
        const b = await inst.methods.balanceOf(contracts.AliveAI).call();
        bals[key] = b;
      } catch (e) {
        bals[key] = '0';
        console.warn(`Failed to fetch balance for ${key}:`, e.message);
      }
    }

    // Use first two tokens as a/b for updateAffective (mirrors your earlier usage)
    if (typeof AliveAI.methods.updateAffective === 'function') {
      gasPrice = await getDynamicGasPrice();
      console.log(`TX4: updateAffective(${bals.DRTv21 || '0'}, ${bals.DRTv22 || '0'})`);
      const tx4 = await AliveAI.methods.updateAffective(bals.DRTv21 || '0', bals.DRTv22 || '0').send({
        from: fromAddr,
        gas: 200000,
        gasPrice
      });
      txHashes.push(tx4.transactionHash);
      console.log('TX4 OK:', tx4.transactionHash);
    } else {
      console.warn('AliveAI.updateAffective() missing; skipping TX4 and still returning results.');
    }

    // Final: compute viewE (best-effort)
    let E_final = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_final = view[0];
    } catch (e) {
      console.warn('viewE call failed:', e.message);
    }

    // maintain small in-memory history
    if (E_final != null) {
      last10E.push(E_final);
      if (last10E.length > 10) last10E.shift();
    }
    lastFourier = computeFourier(E_final);

    // Log success
    logToFile('aliveai_cycles.log', `Cycle OK | from ${fromAddr} | txs ${txHashes.join(',')}`);

    // Return results
    return { E: E_final, last10E, txHashes, balances: bals, fourier: lastFourier };
  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    // log and rethrow a readable error
    logToFile('aliveai_errors.log', `${err.message || String(err)}`);
    throw new Error(err.message || String(err));
  }
}

function getLastFourier() { return lastFourier || computeFourier(null); }

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
