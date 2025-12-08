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

// --- Logging ---
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

// --- Dummy Fourier computation ---
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

// --- Map numeric E to English emotion ---
function describeEmotion(E) {
  if (E === null || E === undefined) return "neutral";
  if (E > 0.8) return "ecstatic";
  if (E > 0.6) return "happy";
  if (E > 0.3) return "curious";
  if (E > 0) return "thoughtful";
  if (E > -0.3) return "tired";
  if (E > -0.6) return "frustrated";
  return "confused";
}

// --- Main Proto-Conscious Cycle ---
async function runProtoConsciousCycle(inputData = {}) {
  try {
    const { stimulus = '', axis = 'DRTv21', amount = 1, tokenSwapOut = 'DRTv22' } = inputData;
    logUserMessage(stimulus);

    const txHashes = [];

    console.log(`Sending submitThought from ${fromAddr} to AliveAI contract ${contracts.AliveAI}`);
    const tx1 = await AliveAI.methods.submitThought().send({
      from: fromAddr,
      gas: 300000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx1.transactionHash);

    // --------- MINT TOKEN ---------
    const tokenInstance = new web3.eth.Contract(ERC20_ABI, tokens[axis]);
    console.log(`Minting ${amount} of ${axis} to ${fromAddr}`);
    const tx2 = await tokenInstance.methods.mint(fromAddr, amount).send({
      from: fromAddr,
      gas: 300000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx2.transactionHash);

    // --------- APPROVE ROUTER ---------
    const balance = await tokenInstance.methods.balanceOf(fromAddr).call();
    const currentAllowance = await tokenInstance.methods.allowance(fromAddr, contracts.Router).call();

    if (web3.utils.toBN(currentAllowance).lt(web3.utils.toBN(balance))) {
      console.log("Approving Router for maximum token spend...");
      await tokenInstance.methods.approve(contracts.Router, MAX_UINT_256).send({
        from: fromAddr,
        gas: 100000,
        gasPrice: CUSTOM_GAS_PRICE
      });
    }

    // --------- MULTIHOP SWAP ---------
    const pool = pools.find(p => p.pair.includes(axis) && p.pair.includes(tokenSwapOut));
    if (!pool) throw new Error(`No pool found for ${axis}/${tokenSwapOut}`);

    const paths = [pool.path];
    console.log(`Executing multiHopSwap for ${tokens[axis]} -> ${tokens[tokenSwapOut]} with amount ${balance}`);
    const Router = new web3.eth.Contract(Router_ABI, contracts.Router);
    const tx3 = await Router.methods.multiHopSwap(
      tokens[axis],
      tokens[tokenSwapOut],
      balance,
      paths,
      Math.floor(Date.now()/1000) + 120
    ).send({
      from: fromAddr,
      gas: 500000,
      gasPrice: CUSTOM_GAS_PRICE
    });
    txHashes.push(tx3.transactionHash);

    // --------- UPDATE AFFECTIVE ---------
    const bals = {};
    for (const tokKey of Object.keys(tokens)) {
      try { 
        const instance = new web3.eth.Contract(ERC20_ABI, tokens[tokKey]);
        bals[tokKey] = await instance.methods.balanceOf(fromAddr).call();
      } catch (e) { 
        bals[tokKey] = '0'; 
        console.warn(`Failed to fetch balance for ${tokKey}:`, e.message); 
      }
    }

    if (typeof AliveAI.methods.updateAffective === 'function') {
      const tx4 = await AliveAI.methods.updateAffective(bals.DRTv21, bals.DRTv22).send({ 
        from: fromAddr, gas: 200000, gasPrice: CUSTOM_GAS_PRICE 
      });
      txHashes.push(tx4.transactionHash);
    }

    // --- Human-readable output ---
    let E_final = null;
    try {
      const view = await AliveAI.methods.viewE().call();
      E_final = view[0];
    } catch (e) { console.warn('Failed to call viewE after update:', e.message); }

    let emotionDescription = "neutral";
    let emotionSentence = "AliveAI is feeling neutral for now.";

    if (E_final != null) { 
      last10E.push(E_final); 
      if (last10E.length > 10) last10E.shift(); 
      lastFourier = computeFourier(E_final);

      emotionDescription = describeEmotion(E_final);
      emotionSentence = `AliveAI is feeling ${emotionDescription} after processing your message!`;
    }

    return { 
      E: E_final, 
      emotionDescription, 
      emotionSentence, 
      last10E, 
      txHashes, 
      balances: bals, 
      fourier: lastFourier 
    };

  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    throw new Error(err.message || String(err));
  }
}

function getLastFourier() { return lastFourier || computeFourier(null); }

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
