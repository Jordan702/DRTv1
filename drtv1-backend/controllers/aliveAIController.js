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
    Router: '0xDRTUniversalRouterV2Address' // replace with actual deployed router if needed
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

// Controller core functions
async function mintEmotion(axis, amount, fromAddress = contracts.AliveAI) {
    const tokenAddress = tokens[axis];
    if (!tokenAddress) throw new Error(`Unknown emotional token: ${axis}`);
    const tx = await EmotionalBase.methods.mint(tokenAddress, amount).send({ from: fromAddress });
    return tx;
}

async function swapEmotion(tokenIn, tokenOut, fromAddress = contracts.AliveAI) {
    const pool = pools.find(p => p.pair.includes(tokenIn) && p.pair.includes(tokenOut));
    if (!pool) throw new Error(`No pool found for ${tokenIn}/${tokenOut}`);
    const path = uniswapVSPath(tokenIn, tokenOut);
    const amountIn = await EmotionalBase.methods.balanceOf(tokens[tokenIn], fromAddress).call();
    const tx = await Router.methods.swapExactTokensForTokens(
        amountIn,
        0,
        path,
        fromAddress,
        Math.floor(Date.now() / 1000) + 60
    ).send({ from: fromAddress });
    return tx;
}

async function updateAffectivePrimaryOpposing(fromAddress = contracts.AliveAI) {
    const balances = {};
    for (const token in tokens) {
        balances[token] = await EmotionalBase.methods.balanceOf(tokens[token], contracts.AliveAI).call();
    }
    const tx = await AliveAI.methods.updateAffectiveState(
        balances['DRTv21'], balances['DRTv22'],
        balances['DRTv23'], balances['DRTv24'],
        balances['DRTv25'], balances['DRTv26'],
        balances['DRTv27'], balances['DRTv28'],
        balances['DRTv29'], balances['DRTv30'],
        balances['DRTv31'], balances['DRTv32'],
        balances['DRTv33'], balances['DRTv34'],
        balances['DRTv35'], balances['DRTv36']
    ).send({ from: fromAddress });
    return tx;
}

async function submitThought(S, C, fromAddress = contracts.AliveAI) {
    const tx = await AliveAI.methods.submitThought(S, C).send({ from: fromAddress });
    const E = await AliveAI.methods.getLatestE().call();
    return E;
}

function storeReflection(E) {
    last10E.push(E);
    if (last10E.length > 10) last10E.shift();
}

// Master cycle
async function runProtoConsciousCycle(inputData, fromAddress = contracts.AliveAI) {
    try {
        const { stimulus, cognition, axis, amount, tokenSwapOut } = inputData;

        // Mint emotional token
        await mintEmotion(axis, amount, fromAddress);

        // Swap token to maintain flux
        await swapEmotion(axis, tokenSwapOut, fromAddress);

        // Update AliveAI affective state
        await updateAffectivePrimaryOpposing(fromAddress);

        // Submit thought
        const E = await submitThought(stimulus, cognition, fromAddress);

        // Store reflection
        storeReflection(E);

        // Return full state
        const state = {
            E,
            last10E,
            balances: await EmotionalBase.methods.balanceOf(tokens[axis], fromAddress).call()
        };
        return state;
    } catch (err) {
        console.error('Error in proto-conscious cycle:', err);
        throw err;
    }
}

// Export controller
module.exports = {
    runProtoConsciousCycle,
    mintEmotion,
    swapEmotion,
    updateAffectivePrimaryOpposing,
    submitThought,
    storeReflection,
    last10E
};
