require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

// ----------------------
//  CONSTANTS
// ----------------------
const MAX_UINT_256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const RPC = process.env.MAINNET_RPC_URL;
const web3 = new Web3(RPC);

// PRIVATE KEY + SIGNER
const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
const signer = web3.eth.accounts.wallet.add(AI_PRIVATE_KEY);
const fromAddr = signer.address;

// ----------------------
//  USE REAL-TIME GAS
// ----------------------
async function getAdaptiveGas() {
  const block = await web3.eth.getBlock("pending");
  const base = Number(block.baseFeePerGas);

  // We ALWAYS stay slightly above the base so we NEVER get rejected
  const tip = web3.utils.toWei("0.00000003", "ether"); // = 0.03 gwei
  const maxPriorityFee = tip;

  const maxFee = base + Number(tip);

  return {
    maxPriorityFeePerGas: web3.utils.toHex(maxPriorityFee),
    maxFeePerGas: web3.utils.toHex(maxFee)
  };
}

// ----------------------
//  ABI CONTRACTS
// ----------------------
const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const Router_ABI   = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const ERC20_ABI    = require(path.join(__dirname, '../abi/DRTv15_abi.json'));

const contracts = {
  AliveAI: process.env.ALIVEAI_CONTRACT_ADDRESS,
  Router:  process.env.DRT_UNIVERSAL_ROUTER
};

// ----------------------
//  TOKEN + POOL TABLES
// ----------------------
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

// Match pairs
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

// ----------------------
//  LOGGING
// ----------------------
function logStimulus(msg) {
  const logPath = path.join(__dirname, '../logs/aliveai_messages.log');
  const entry = `${new Date().toISOString()} | ${msg}\n`;
  fs.appendFileSync(logPath, entry);
}

// ----------------------
//  MAIN LOOP
// ----------------------
async function runProtoConsciousCycle(input = {}) {
  try {
    const { stimulus = "", axis = "DRTv21", amount = 1, tokenSwapOut = "DRTv22" } = input;

    logStimulus(stimulus);

    const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);

    const gas = await getAdaptiveGas();

    // --------------------------------------------------
    // 1. submitThought()
    // --------------------------------------------------
    console.log("🔥 submitThought()");
    await AliveAI.methods.submitThought().send({
      from: fromAddr,
      gas: 150000,
      ...gas
    });

    // --------------------------------------------------
    // 2. Mint token
    // --------------------------------------------------
    const token = new web3.eth.Contract(ERC20_ABI, tokens[axis]);

    console.log(`🔥 Mint ${amount} ${axis}`);
    await token.methods.mint(fromAddr, amount).send({
      from: fromAddr,
      gas: 200000,
      ...gas
    });

    // --------------------------------------------------
    // 3. Approve router
    // --------------------------------------------------
    const balance = await token.methods.balanceOf(fromAddr).call();
    const allowance = await token.methods.allowance(fromAddr, contracts.Router).call();

    if (web3.utils.toBN(allowance).lt(web3.utils.toBN(balance))) {
      console.log("🔥 Approving router...");
      await token.methods.approve(contracts.Router, MAX_UINT_256).send({
        from: fromAddr,
        gas: 120000,
        ...gas
      });
    }

    // --------------------------------------------------
    // 4. Multi-hop swap
    // --------------------------------------------------
    const pool = pools.find(p =>
      p.pair.includes(axis) && p.pair.includes(tokenSwapOut)
    );
    if (!pool) throw new Error(`No pool for ${axis}/${tokenSwapOut}`);

    const Router = new web3.eth.Contract(Router_ABI, contracts.Router);

    console.log(`🔥 Swap ${axis} → ${tokenSwapOut}`);
    await Router.methods.multiHopSwap(
      tokens[axis],
      tokens[tokenSwapOut],
      balance,
      [pool.path],
      Math.floor(Date.now()/1000) + 120
    ).send({
      from: fromAddr,
      gas: 400000,
      ...gas
    });

    // --------------------------------------------------
    // 5. Pull all balances + update affective
    // --------------------------------------------------
    const bals = {};
    for (const k of Object.keys(tokens)) {
      const inst = new web3.eth.Contract(ERC20_ABI, tokens[k]);
      bals[k] = await inst.methods.balanceOf(fromAddr).call();
    }

    if (AliveAI.methods.updateAffective) {
      console.log("🔥 updateAffective()");
      await AliveAI.methods.updateAffective(
        bals.DRTv21, bals.DRTv22
      ).send({
        from: fromAddr,
        gas: 150000,
        ...gas
      });
    }

    // Return all
    return {
      success: true,
      balances: bals
    };

  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  runProtoConsciousCycle
};
