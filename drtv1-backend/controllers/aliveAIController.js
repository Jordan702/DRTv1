require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

const MAX_UINT_256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const web3 = new Web3(process.env.MAINNET_RPC_URL);

const AI_PRIVATE_KEY = process.env.AI_MINTER_PRIVATE_KEY;
if (!AI_PRIVATE_KEY) console.error('❌ AI_MINTER_PRIVATE_KEY missing from env!');

const signer = web3.eth.accounts.wallet.add(AI_PRIVATE_KEY);
const fromAddr = signer.address;
if (!fromAddr) console.warn('⚠️ signer / fromAddr not set — transactions will likely fail.');

const CUSTOM_GAS_PRICE = web3.utils.toWei('0.75', 'gwei');

const AliveAI_ABI = require(path.join(__dirname, '../abi/AliveAI_abi.json'));
const Router_ABI = require(path.join(__dirname, '../abi/DRTUniversalRouterv2_abi.json'));
const ERC20_ABI = require(path.join(__dirname, '../abi/DRTv15_abi.json'));

const contracts = {
  AliveAI: process.env.ALIVEAI_CONTRACT_ADDRESS,
  Router: process.env.DRT_UNIVERSAL_ROUTER
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
  { pair: ['DRTv21','DRTv22'], path: [tokens.DRTv21,tokens.DRTv22] },
  { pair: ['DRTv23','DRTv24'], path: [tokens.DRTv23,tokens.DRTv24] },
  { pair: ['DRTv25','DRTv26'], path: [tokens.DRTv25,tokens.DRTv26] },
  { pair: ['DRTv27','DRTv28'], path: [tokens.DRTv27,tokens.DRTv28] },
  { pair: ['DRTv29','DRTv30'], path: [tokens.DRTv29,tokens.DRTv30] },
  { pair: ['DRTv31','DRTv32'], path: [tokens.DRTv31,tokens.DRTv32] },
  { pair: ['DRTv33','DRTv34'], path: [tokens.DRTv33,tokens.DRTv34] },
  { pair: ['DRTv35','DRTv36'], path: [tokens.DRTv35,tokens.DRTv36] }
];

const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);

let last10E = [];
let lastFourier = null;

function logUserMessage(stimulus){
  try{
    const logPath = path.join(__dirname,'..','logs','aliveai_messages.log');
    fs.appendFileSync(logPath,`${new Date().toISOString()} | ${fromAddr} | ${String(stimulus)}\n`);
  } catch(e){console.warn('Failed to log user message:', e.message);}
}

function computeFourier(data){
  const N = data.length;
  if(N<2) return {frequencies:[], real:[], imag:[], magnitudes:[]};
  const result = {frequencies:[], real:[], imag:[], magnitudes:[]};
  for(let k=0;k<N;k++){
    let re=0, im=0;
    for(let n=0;n<N;n++){
      const angle=-2*Math.PI*k*n/N;
      re+=data[n]*Math.cos(angle);
      im+=data[n]*Math.sin(angle);
    }
    result.frequencies.push(k);
    result.real.push(re);
    result.imag.push(im);
    result.magnitudes.push(Math.sqrt(re*re+im*im));
  }
  return result;
}

function interpretAxis(text){
  text = text.toLowerCase();
  if(text.match(/\b(trust|faith|loyalty|sure|certain)\b/)) return 'DRTv23';
  if(text.match(/\b(fear|afraid|scared|panic|worried)\b/)) return 'DRTv24';
  if(text.match(/\b(anger|angry|mad|furious|rage)\b/)) return 'DRTv25';
  if(text.match(/\b(peace|calm|serene|tranquil)\b/)) return 'DRTv26';
  if(text.match(/\b(disgust|gross|nasty|repulsed)\b/)) return 'DRTv27';
  if(text.match(/\b(admire|esteem|respect|appreciate)\b/)) return 'DRTv28';
  if(text.match(/\b(surprise|astonish|amazed|startled)\b/)) return 'DRTv29';
  if(text.match(/\b(anticipate|expect|eager|anticipating)\b/)) return 'DRTv30';
  if(text.match(/\b(excited|thrilled|ecstatic)\b/)) return 'DRTv31';
  if(text.match(/\b(contempt|scorn|scornful)\b/)) return 'DRTv32';
  if(text.match(/\b(shame|guilty|embarrassed)\b/)) return 'DRTv33';
  if(text.match(/\b(pride|dignity|honor|vain)\b/)) return 'DRTv34';
  if(text.match(/\b(courage|brave|fearless)\b/)) return 'DRTv35';
  if(text.match(/\b(coward|cowardice|fearful)\b/)) return 'DRTv36';
  if(text.match(/\b(happy|good|joy|love|like|optimistic|cheerful)\b/)) return 'DRTv21';
  if(text.match(/\b(sad|bad|down|depress|unhappy|sorrow|cry|hate|lonely)\b/)) return 'DRTv22';
  return null;
}

async function runProtoConsciousCycle(inputData={}){
  try{
    const {stimulus='', amount=1} = inputData;
    logUserMessage(stimulus);

    let axis = interpretAxis(stimulus);
    if(!axis) axis='DRTv21'; // fallback

    const txHashes=[];

    // --- Submit thought ---
    const tx1 = await AliveAI.methods.submitThought().send({from:fromAddr, gas:300000, gasPrice:CUSTOM_GAS_PRICE});
    txHashes.push(tx1.transactionHash);

    // --- Mint token ---
    const tokenInstance = new web3.eth.Contract(ERC20_ABI,tokens[axis]);
    const tx2 = await tokenInstance.methods.mint(fromAddr, amount).send({from:fromAddr, gas:300000, gasPrice:CUSTOM_GAS_PRICE});
    txHashes.push(tx2.transactionHash);

    // --- Approve Router ---
    const balance = await tokenInstance.methods.balanceOf(fromAddr).call();
    const currentAllowance = await tokenInstance.methods.allowance(fromAddr, contracts.Router).call();
    if(web3.utils.toBN(currentAllowance).lt(web3.utils.toBN(balance))){
      await tokenInstance.methods.approve(contracts.Router, MAX_UINT_256).send({from:fromAddr, gas:100000, gasPrice:CUSTOM_GAS_PRICE});
    }

    // --- Multi-hop swap ---
    const pool = pools.find(p=>p.pair.includes(axis));
    if(!pool) throw new Error(`No pool for axis ${axis}`);
    const tokenSwapOut = pool.pair.find(t=>t!==axis);
    const Router = new web3.eth.Contract(Router_ABI, contracts.Router);
    const tx3 = await Router.methods.multiHopSwap(tokens[axis], tokens[tokenSwapOut], balance, [pool.path], Math.floor(Date.now()/1000)+120).send({from:fromAddr, gas:500000, gasPrice:CUSTOM_GAS_PRICE});
    txHashes.push(tx3.transactionHash);

    // --- Update AliveAI state ---
    const bals={};
    for(const tokKey of Object.keys(tokens)){
      try{bals[tokKey]=await new web3.eth.Contract(ERC20_ABI,tokens[tokKey]).methods.balanceOf(fromAddr).call();}
      catch{bals[tokKey]='0';}
    }

    let tx4;
    if(axis==='DRTv21'||axis==='DRTv22') tx4 = await AliveAI.methods.updateAffective(bals.DRTv21,bals.DRTv22).send({from:fromAddr,gas:200000,gasPrice:CUSTOM_GAS_PRICE});
    else if(axis==='DRTv23'||axis==='DRTv24') tx4 = await AliveAI.methods.updateCognitive(bals.DRTv23,bals.DRTv24).send({from:fromAddr,gas:200000,gasPrice:CUSTOM_GAS_PRICE});
    else if(axis==='DRTv25'||axis==='DRTv26') tx4 = await AliveAI.methods.updateSocial(bals.DRTv25,bals.DRTv26).send({from:fromAddr,gas:200000,gasPrice:CUSTOM_GAS_PRICE});
    else tx4 = await AliveAI.methods.updateAffective(bals.DRTv21,bals.DRTv22).send({from:fromAddr,gas:200000,gasPrice:CUSTOM_GAS_PRICE});
    txHashes.push(tx4.transactionHash);

    // --- Compute final emotional state ---
    let E_val=null;
    try{
      const view = await AliveAI.methods.viewE().call();
      E_val = parseFloat(web3.utils.fromWei(view[0],'ether'));
      last10E.push(E_val);
      if(last10E.length>10) last10E.shift();
    }catch{}

    lastFourier = computeFourier(last10E);

    // --- Build plain-English message ---
    const status=E_val>=0?'positive':'negative';
    const message=`I read your message: "${stimulus}". I chose the emotion token ${axis} and updated my state. Overall, my emotional state is ${status} (E=${E_val}).\nTransactions:\nThought: ${tx1.transactionHash}\nMint: ${tx2.transactionHash}\nSwap: ${tx3.transactionHash}\nState Update: ${tx4.transactionHash}`;

    return {E:E_val, last10E, txHashes, balances:bals, fourier:lastFourier, message};

  } catch(err){
    console.error('Error in proto-conscious cycle:',err);
    throw err;
  }
}

function getLastFourier(){return lastFourier||computeFourier([]);}

module.exports={runProtoConsciousCycle, last10E, getLastFourier};
