require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const Web3 = require("web3"); // keep if you still need it
const { ethers } = require("ethers"); // ✅ added ethers

// Import routes
const drtradeRoutes = require("./routes/drtradeRoute");
const submitRoute = require("./routes/submit");
const vaultRoutes = require("./routes/vaultRoutes");
const transactionsRoute = require("./routes/transactions");
const tradeRoutes = require("./routes/tradeRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const meshSwapHandler = require("./controllers/meshSwapController");
const meshRouterv1Route = require("./routes/meshRouterv1Route");
const mountMeshRouterPlugin = require("./mesh-router-plugin/index");
const mintRoute = require("./routes/mint"); // ✅ sETH mint API


// ✅ New DMOS routes
const DMOSroute = require("./routes/DMOSroute");

const app = express();

// CORS setup
const corsOptions = {
  origin: "https://jordan702.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

ensureDirectoryExists(path.join(__dirname, "logs"));
ensureDirectoryExists(path.join(__dirname, "uploads"));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ✅ Ethereum provider + wallet
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
let wallet;
if (process.env.MINTER_PRIVATE_KEY) {
  wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);
}

// ✅ Attach provider/wallet globally in req
app.use((req, res, next) => {
  req.provider = provider;
  req.wallet = wallet;
  next();
});

// ✅ Mount routes
app.use("/api/transactions", transactionsRoute);
app.use("/api/swap", drtradeRoutes);
app.use("/api/verify", submitRoute);
app.use("/api/vault", vaultRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/", meshRouterv1Route);

// Mount mint API
app.use("/api/mint", mintRoute);


// ✅ Mount mesh plugin
app.use("/mesh-plugin", mountMeshRouterPlugin());
// ✅ Mount DMOS API
app.use("/dmos", DMOSroute);

// ✅ Mesh swap API
app.post("/api/meshSwap", meshSwapHandler.meshSwap);

// ✅ Liquidity cache access
app.get("/api/liquidity", async (req, res) => {
  try {
    if (!global.liquidityCache || Object.keys(global.liquidityCache).length === 0) {
      return res.status(500).json({ error: "❌ Liquidity data unavailable." });
    }
    return res.status(200).json(global.liquidityCache);
  } catch (error) {
    console.error("❌ Liquidity Fetch Error:", error);
    return res.status(500).json({ error: "❌ Failed to retrieve liquidity data." });
  }
});

// ✅ Serve frontend
const frontendPath = path.resolve(__dirname, "../drtv1-frontend");
app.use(express.static(frontendPath));

// ✅ UI routes
app.get(["/approve", "/swap"], (req, res) => {
  res.sendFile(path.join(frontendPath, "drtrade.html"));
});

// ✅ Health
app.get("/health", (req, res) => {
  res.send("✅ DRTv1 Backend API is live 🚀");
});

// ✅ Logs
app.get("/api/dashboard", (req, res) => {
  const logPath = path.resolve(__dirname, "logs/submissions.json");
  try {
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load submission logs", details: err.message });
  }
});

app.get("/api/swap", (req, res) => {
  const logPath = path.resolve(__dirname, "logs/swap.json");
  try {
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load swap logs", details: err.message });
  }
});

// ✅ Price API
app.get('/price', async (req, res) => {
  const cmcId = req.query.cmc_id;
  if (!cmcId) return res.status(400).json({ error: 'Missing cmc_id' });

  try {
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmcId}`,
      { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } }
    );
    const price = response.data.data[cmcId].quote.USD.price;
    res.json({ price });
  } catch (error) {
    console.error('CMC API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch price from CMC' });
  }
});

// ✅ Add new pool
app.post("/pools", (req, res) => {
  const newPool = req.body;
  const poolsPath = path.join(__dirname, "../drtv1-frontend/pools.json");

  try {
    const currentPools = fs.existsSync(poolsPath)
      ? JSON.parse(fs.readFileSync(poolsPath))
      : [];

    currentPools.push(newPool);
    fs.writeFileSync(poolsPath, JSON.stringify(currentPools, null, 2));

    res.status(200).json({ success: true, message: "✅ Pool added to pools.json" });
  } catch (err) {
    console.error("❌ Failed to append pool:", err);
    res.status(500).json({ error: "Failed to write to pools.json" });
  }
});

// ✅ GET pools.json for frontend rendering
app.get("/pools", (req, res) => {
  const poolsPath = path.join(__dirname, "../drtv1-frontend/pools.json");
  try {
    const pools = fs.existsSync(poolsPath) ? JSON.parse(fs.readFileSync(poolsPath)) : [];
    res.json(pools);
  } catch (err) {
    console.error("❌ Failed to load pools.json:", err);
    res.status(500).json({ error: "Failed to load pools" });
  }
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("🌐 Global Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});
