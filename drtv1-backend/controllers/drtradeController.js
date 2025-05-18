require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios'); // Import Axios for USD price fetching

// Load contract ABIs from JSON files
const DRTRADE_ABI = require('../abi/DRTrade_abi.json');
const DRT_ABI = require('../abi/DRT_abi.json');
const WETH_ABI = require('../abi/WETH_abi.json');

// Contract addresses
const DRTRADE_ADDRESS = process.env.DRTRADE_CONTRACT_ADDRESS || "0xD0DC7f8935A661010D56A470eA81572a4a84EED4";
const DRT_TOKEN_ADDRESS = process.env.DRT_CONTRACT_ADDRESS; // Ensure it's correctly set in `.env`
const WETH_TOKEN_ADDRESS = process.env.WETH_CONTRACT_ADDRESS; // Ensure it's correctly set in `.env`
const POOL_ADDRESS = "0xe1c76fbf1b373165822b564c6f3accf78c5a344a"; // DRTv1/WETH Liquidity Pool address

// Setup provider and wallet
if (!process.env.MAINNET_RPC_URL || !process.env.MINTER_PRIVATE_KEY) {
    throw new Error("❌ Missing environment variables: MAINNET_RPC_URL or MINTER_PRIVATE_KEY.");
}

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

// Create contract instances
console.log("🔄 Syncing contract instances...");
const drTradeContract = new ethers.Contract(DRTRADE_ADDRESS, DRTRADE_ABI, wallet);
const drTokenContract = new ethers.Contract(DRT_TOKEN_ADDRESS, DRT_ABI, provider);
const wethTokenContract = new ethers.Contract(WETH_TOKEN_ADDRESS, WETH_ABI, provider);

console.log("✅ Synced contracts:");
console.log("🔹 DRTrade.sol Contract Address:", DRTRADE_ADDRESS);
console.log("🔹 DRT Token Contract Address:", DRT_TOKEN_ADDRESS);
console.log("🔹 WETH Token Contract Address:", WETH_TOKEN_ADDRESS);
console.log("🔹 Liquidity Pool Address:", POOL_ADDRESS);

// ✅ Liquidity Cache
let liquidityCache = { drt: "0", weth: "0", drtUSD: "0", wethUSD: "0", drtWETH: "0" };
let lastFetchedPrices = null;
let lastFetchedTime = 0;

// ✅ Fetch USD price of DRTv1 and WETH
const fetchUSDPrices = async () => {
    const now = Date.now();

    if (lastFetchedPrices && now - lastFetchedTime < 120000) {
        return lastFetchedPrices;
    }

    try {
        const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=weth&vs_currencies=usd");
        const wethPriceUSD = response.data?.weth?.usd || 2500; // ✅ Fallback price

        lastFetchedPrices = {
            drtUSD: 1576921230, // Hardcoded price (Update if necessary)
            weth: wethPriceUSD,
            drtWETH: 1576921230 / wethPriceUSD // Convert dynamically
        };

        lastFetchedTime = now;
        return lastFetchedPrices;
    } catch (error) {
        console.error("❌ Error fetching USD prices:", error);
        return { drtUSD: 1576921230, weth: 2500, drtWETH: 1576921230 / 2500 }; // Fallback values
    }
};

// ✅ Update liquidity balances
const updateLiquidity = async () => {
    try {
        console.log("🔄 Checking liquidity pool balances...");
        const poolDRTBalance = await drTokenContract.balanceOf(POOL_ADDRESS);
        const poolWETHBalance = await wethTokenContract.balanceOf(POOL_ADDRESS);
        const usdPrices = await fetchUSDPrices(); // Get USD rates

        liquidityCache = {
            drt: ethers.formatUnits(poolDRTBalance, 18),
            weth: ethers.formatUnits(poolWETHBalance, 18),
            drtUSD: (ethers.formatUnits(poolDRTBalance, 18) * usdPrices.drtUSD).toFixed(2),
            wethUSD: (ethers.formatUnits(poolWETHBalance, 18) * usdPrices.weth).toFixed(2),
            drtWETH: usdPrices.drtWETH.toFixed(6)
        };

        console.log("✅ Liquidity Pool Updated:", liquidityCache);
    } catch (error) {
        console.error("❌ Error updating liquidity:", error);
    }
};

// ✅ Liquidity Check Function
const liquidityCheck = async (req, res) => {
    try {
        const { walletAddress, direction, amount } = req.body;
        console.log(`🔎 Received request from wallet: ${walletAddress}`);

        const isBuy = direction.toLowerCase() === "buy";
        const amountBN = ethers.parseUnits(amount, 18);
        const usdPrices = await fetchUSDPrices(); // Fetch USD conversion rates

        // Convert user's trade amount to USD & WETH equivalent
        const userAmountUSD = isBuy
            ? (ethers.formatUnits(amountBN, 18) * usdPrices.weth).toFixed(2)
            : (ethers.formatUnits(amountBN, 18) * usdPrices.drtUSD).toFixed(2);

        const userAmountWETH = (ethers.formatUnits(amountBN, 18) * usdPrices.drtWETH).toFixed(6);

        // ✅ Validate liquidity
        const sufficientLiquidity = isBuy
            ? parseFloat(liquidityCache.drtUSD) >= parseFloat(userAmountUSD)
            : parseFloat(liquidityCache.wethUSD) >= parseFloat(userAmountUSD);

        if (!sufficientLiquidity) {
            console.log(`❌ Liquidity insufficient for ${isBuy ? "buy" : "sell"}.`);
            return res.status(400).json({ error: "❌ Insufficient liquidity for trade." });
        }

        console.log("✅ Liquidity check passed.", { userAmountUSD, userAmountWETH });
        return res.status(200).json({ status: "proceed", userAmountUSD, userAmountWETH });

    } catch (error) {
        console.error("🚨 Liquidity check error:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Liquidity check failed", details: error.message });
        }
    }
};

// ✅ Export functions
module.exports = { liquidityCheck, updateLiquidity, executeTrade };

