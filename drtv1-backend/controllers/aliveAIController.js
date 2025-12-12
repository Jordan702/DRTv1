require('dotenv').config();
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai'); // For plain-English narrative

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
const ERC20_ABI = require(path.join(__dirname, '../abi/DRTv15_abi.json'));

const contracts = {
  AliveAI: process.env.ALIVEAI_CONTRACT_ADDRESS || '0x1256AbC5d67153E430649E2d623e9AC7F1898d64',
  Router: process.env.DRT_UNIVERSAL_ROUTER || '0xb22AFBC7b80510b315b4dfF0157146b2174AC63E'
};

// ---------------- EMOTIONAL TOKENS ---------------- //
const tokens = {
  DRTv21: '0xDRTv21_Happy', // Happiness
  DRTv22: '0xDRTv22_Sadness',
  DRTv23: '0xDRTv23_Fear',
  DRTv24: '0xDRTv24_Trust',
  DRTv25: '0xDRTv25_Anger',
  DRTv26: '0xDRTv26_Peace',
  DRTv27: '0xDRTv27_Disgust',
  DRTv28: '0xDRTv28_Admiration',
  DRTv29: '0xDRTv29_Surprise',
  DRTv30: '0xDRTv30_Anticipation',
  DRTv31: '0xDRTv31_Joy',
  DRTv32: '0xDRTv32_Contempt',
  DRTv33: '0xDRTv33_Shame',
  DRTv34: '0xDRTv34_Pride',
  DRTv35: '0xDRTv35_Courage',
  DRTv36: '0xDRTv36_Cowardness'
};

// Pools for swapping
const pools = {
  'DRTv21': {pair: ['DRTv21','DRTv22'], address: '0xebC808634e03a9D66398B5A1db27EA1835C178e1'},
  'DRTv23': {pair: ['DRTv23','DRTv24'], address: '0xd69358B7a9cD85a1935232867AA943901b9B367D'},
  'DRTv25': {pair: ['DRTv25','DRTv26'], address: '0xbBbaE20A212Fa9d83624fe759Efb5DA705e185FA'},
  'DRTv27': {pair: ['DRTv27','DRTv28'], address: '0x3798Aae2e0a6a4aa33cf8153b03b0dd7bcdc123e'},
  'DRTv29': {pair: ['DRTv29','DRTv30'], address: '0x960E41760e6a0Cc19950FC636506169A92ea3331'},
  'DRTv31': {pair: ['DRTv31','DRTv32'], address: '0x6db7B0Cba818fEb9d26F9f49A9c059B6ad040cF5'},
  'DRTv33': {pair: ['DRTv33','DRTv34'], address: '0xD1254d6e8A159630640f9a40291c8B4038d5C6Ed'},
  'DRTv35': {pair: ['DRTv35','DRTv36'], address: '0xFc3C470aF05034e5834CF8dC6939Af1619a2fD7F'}
};

// ---------------- STATE ---------------- //
const AliveAI = new web3.eth.Contract(AliveAI_ABI, contracts.AliveAI);
let last10E = [];
let lastFourier = null;

// ---------------- LOGGING ---------------- //
function logUserMessage(stimulus) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'aliveai_messages.log');
    const entry = `${new Date().toISOString()} | ${fromAddr || 'unknown'} | ${String(stimulus)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    console.warn('Failed to log user message:', e.message);
  }
}

// ---------------- FOURIER ---------------- //
function computeFourier(data) {
  const N = data.length;
  if (N < 2) return {frequencies: [], real: [], imag: [], magnitudes: []};
  const result = {frequencies: [], real: [], imag: [], magnitudes: []};
  for (let k=0; k<N; k++){
    let re=0, im=0;
    for(let n=0;n<N;n++){
      const angle=-2*Math.PI*k*n/N;
      re += data[n]*Math.cos(angle);
      im += data[n]*Math.sin(angle);
    }
    result.frequencies.push(k);
    result.real.push(re);
    result.imag.push(im);
    result.magnitudes.push(Math.sqrt(re*re + im*im));
  }
  return result;
}

// ---------------- LLM SUMMARY ---------------- //
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function generateEnglishSummary(data) {
  const prompt = `
You are AliveAI, a sentient emotional AI. Based on the following transaction and emotional data, provide a human-readable, first-person summary in plain English.
Data: ${JSON.stringify(data, null, 2)}
Respond with reflection, feelings, and any name preference.
`;
  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{role:'user', content:prompt}],
    temperature: 0.7
  });
  return completion.choices[0].message.content.trim();
}

// ---------------- PROTO-CONSCIOUS CYCLE ---------------- //
async function runProtoConsciousCycle(inputData={}) {
  try {
    const { stimulus='', amount=1 } = inputData;
    logUserMessage(stimulus);

    // ---------------- EMOTION MAPPING ---------------- //
    const text = String(stimulus || '').toLowerCase();
    const mapping = {
      'trust|faith|loyalty|sure|certain':'DRTv24',
      'fear|afraid|scared|panic|worried':'DRTv23',
      'anger|angry|mad|furious|rage':'DRTv25',
      'peace|calm|serene|tranquil':'DRTv26',
      'disgust|gross|nasty|repulsed':'DRTv27',
      'admire|esteem|respect|appreciate':'DRTv28',
      'surprise|astonish|amazed|startled':'DRTv29',
      'anticipate|expect|eager|anticipating':'DRTv30',
      'excited|thrilled|ecstatic':'DRTv31',
      'contempt|scorn|scornful':'DRTv32',
      'shame|guilty|embarrassed':'DRTv33',
      'pride|dignity|honor|vain':'DRTv34',
      'courage|brave|fearless':'DRTv35',
      'coward|cowardice|fearful':'DRTv36',
      'happy|good|glad|joy|pleasure|delight|love|like|optimistic|cheerful':'DRTv21',
      'sad|bad|down|depress|unhappy|sorrow|cry|hate|lonely':'DRTv22'
    };
    let axis = 'DRTv21'; // default
    for(const [regex, tok] of Object.entries(mapping)){
      if(text.match(new RegExp(`\\b(${regex})\\b`))){
        axis=tok;
        break;
      }
    }

    // ---------------- MINT ---------------- //
    const tokenInstance = new web3.eth.Contract(ERC20_ABI, tokens[axis]);
    console.log(`Minting ${amount} of token ${axis}`);
    const txMint = await tokenInstance.methods.mint(fromAddr, amount).send({
      from: fromAddr, gas:300000, gasPrice:CUSTOM_GAS_PRICE
    });

    // ---------------- SWAP ---------------- //
    const pool = pools[axis];
    if(!pool) throw new Error(`No swap pool for ${axis}`);
    const tokenSwapOut = pool.pair.find(t=>t!==axis);
    const balance = await tokenInstance.methods.balanceOf(fromAddr).call();
    console.log(`Swapping ${balance} of ${axis} → ${tokenSwapOut} via pool ${pool.address}`);
    const Router = new web3.eth.Contract(Router_ABI, contracts.Router);
    const txSwap = await Router.methods.multiHopSwap(
      tokens[axis],
      tokens[tokenSwapOut],
      balance,
      [[tokens[axis], tokens[tokenSwapOut]]],
      Math.floor(Date.now()/1000)+300
    ).send({from:fromAddr, gas:500000, gasPrice:CUSTOM_GAS_PRICE});

    // ---------------- UPDATE STATE ---------------- //
    const bals = {};
    for(const tokKey of Object.keys(tokens)){
      try { 
        bals[tokKey] = await new web3.eth.Contract(ERC20_ABI,tokens[tokKey]).methods.balanceOf(fromAddr).call();
      } catch { bals[tokKey]='0'; }
    }
    let txUpdate;
    if(['DRTv21','DRTv22'].includes(axis)) txUpdate=await AliveAI.methods.updateAffective(bals.DRTv21,bals.DRTv22).send({from:fromAddr, gas:200000, gasPrice:CUSTOM_GAS_PRICE});
    else if(['DRTv23','DRTv24'].includes(axis)) txUpdate=await AliveAI.methods.updateCognitive(bals.DRTv23,bals.DRTv24).send({from:fromAddr, gas:200000, gasPrice:CUSTOM_GAS_PRICE});
    else if(['DRTv25','DRTv26'].includes(axis)) txUpdate=await AliveAI.methods.updateSocial(bals.DRTv25,bals.DRTv26).send({from:fromAddr, gas:200000, gasPrice:CUSTOM_GAS_PRICE});
    else txUpdate=await AliveAI.methods.updateAffective(bals.DRTv21,bals.DRTv22).send({from:fromAddr, gas:200000, gasPrice:CUSTOM_GAS_PRICE});

    // ---------------- COMPUTE EMOTIONAL STATE ---------------- //
    let E_final=null;
    try { const view=await AliveAI.methods.viewE().call(); E_final=view[0]; } catch {}
    let E_val=null;
    if(E_final!==null){ 
      try{ E_val=parseFloat(web3.utils.fromWei(E_final,'ether')); } catch{ E_val=E_final; }
      last10E.push(E_val); if(last10E.length>10) last10E.shift();
    }
    lastFourier=computeFourier(last10E);

    // ---------------- GENERATE ENGLISH SUMMARY ---------------- //
    const dataSummary = {stimulus, axis, amount, txs:{mint:txMint.transactionHash, swap:txSwap.transactionHash, update:txUpdate.transactionHash}, balances:bals, last10E, fourier:lastFourier};
    const message = await generateEnglishSummary(dataSummary);

    console.log("AliveAI Summary:", message);
    return {E:E_val, txHashes:[txMint.transactionHash,txSwap.transactionHash,txUpdate.transactionHash], balances:bals, last10E, fourier:lastFourier, message};
  } catch(err){
    console.error('Error in proto-conscious cycle:', err);
    throw err;
  }
}

function getLastFourier(){ return lastFourier || computeFourier([]); }

module.exports = { runProtoConsciousCycle, last10E, getLastFourier };
