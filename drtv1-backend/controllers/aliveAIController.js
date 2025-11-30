// aliveAIController.js
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

// Setup web3 provider
const web3 = new Web3(process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY');

// Load ABIs
const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const EmotionalBase_ABI = require(path.join(__dirname, '../abi/DRT_EmotionalBase_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));

// Load utils
const uniswapVSPath = require(path.join(__dirname, '../utils/uniswapVSPath.js'));

// Contract addresses
const contracts = {
  AliveAI: process.env.ALIVEAI_WALLET || '0x1256AbC5d67153E430649E2d623e9AC7F1898d64',
  EmotionalBase: '0x9Bd5e5eF7dA59168820dD3E4A39Db39FfD26489f',
  Router: '0xb22AFBC7b80510b315b4dfF0157146b2174AC63E' // hardcoded DRT Universal Router V2
};

// Emotional tokens mapping
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

// Pools mapping (token pairs to pool addresses)
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

// Instantiate contracts
const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);
const EmotionalBase = new web3.eth.Contract(EmotionalBase_ABI, contracts.EmotionalBase);
const Router = new web3.eth.Contract(Router_ABI, contracts.Router);

// Reflection storage
let last10E = [];
let lastFourier = null;

// Fourier placeholder: compute simple S,C,W,T,F,R waveform representation
function computeFourier(E) {
  // For demonstration, return a fake waveform of 6 pillars
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

// normalizeFromAddress helper: accepts ethers Wallet or string or { address }
function normalizeFromAddress(fromAddress) {
  if (!fromAddress) return contracts.AliveAI;
  // ethers Wallet object
  if (typeof fromAddress === 'object') {
    if (fromAddress.address) return fromAddress.address;
    if (fromAddress._address) return fromAddress._address;
  }
  if (typeof fromAddress === 'string') return fromAddress;
  return contracts.AliveAI;
}

// Master cycle with 4 transactions
async function runProtoConsciousCycle(inputData, fromAddress = contracts.AliveAI) {
  try {
    const { stimulus, cognition, axis = 'DRTv21', amount = 1, tokenSwapOut = 'DRTv22' } = inputData || {};
    const txHashes = []; // store 4 txs

    // Normalize fromAddress to a simple address string for web3 .send({from: addr})
    const fromAddr = normalizeFromAddress(fromAddress);

    // 1️⃣ User message transaction (submitThought)
    // NOTE: contract method names and parameter types must match ABI
    const userTx = await AliveAI.methods.submitThought(stimulus || '', cognition || '').send({ from: fromAddr });
    txHashes.push(userTx.transactionHash);

    // 2️⃣ Mint emotional token
    if (!tokens[axis]) throw new Error(`Unknown axis token: ${axis}`);
    const mintTx = await EmotionalBase.methods.mint(tokens[axis], amount).send({ from: fromAddr });
    txHashes.push(mintTx.transactionHash);

    // 3️⃣ Swap token in liquidity pool
    const pool = pools.find(p => p.pair.includes(axis) && p.pair.includes(tokenSwapOut));
    if (!pool) throw new Error(`No pool found for ${axis}/${tokenSwapOut}`);
    const path = uniswapVSPath(tokens[axis], tokens[tokenSwapOut]); // pass actual token addresses
    const amountIn = await EmotionalBase.methods.balanceOf(tokens[axis], fromAddr).call();
    const swapTx = await Router.methods.swapExactTokensForTokens(
      amountIn,
      0,
      path,
      fromAddr,
      Math.floor(Date.now() / 1000) + 60
    ).send({ from: fromAddr });
    txHashes.push(swapTx.transactionHash);

    // 4️⃣ AliveAI response → update affective state
    const balances = {};
    for (const token in tokens) {
      balances[token] = await EmotionalBase.methods.balanceOf(tokens[token], contracts.AliveAI).call();
    }
    const updateTx = await AliveAI.methods.updateAffectiveState(
      balances['DRTv21'], balances['DRTv22'],
      balances['DRTv23'], balances['DRTv24'],
      balances['DRTv25'], balances['DRTv26'],
      balances['DRTv27'], balances['DRTv28'],
      balances['DRTv29'], balances['DRTv30'],
      balances['DRTv31'], balances['DRTv32'],
      balances['DRTv33'], balances['DRTv34'],
      balances['DRTv35'], balances['DRTv36']
    ).send({ from: fromAddr });
    txHashes.push(updateTx.transactionHash);

    // Store reflection
    const E = await AliveAI.methods.getLatestE().call();
    last10E.push(E);
    if (last10E.length > 10) last10E.shift();

    // Fourier representation (store for API)
    lastFourier = computeFourier(E);

    // Return combined state
    return {
      E,
      last10E,
      txHashes,
      balances: await EmotionalBase.methods.balanceOf(tokens[axis], fromAddr).call(),
      fourier: lastFourier
    };

  } catch (err) {
    console.error('Error in proto-conscious cycle:', err);
    throw err;
  }
}

// small helper to get the last Fourier snapshot
function getLastFourier() {
  return lastFourier || computeFourier(last10E[last10E.length - 1] || null);
}

module.exports = {
  runProtoConsciousCycle,
  last10E,
  getLastFourier
};
