require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// Import routes (make sure these files exist and export valid Express routers)
const drtradeRoutes = require("./routes/drtradeRoute"); // Trade endpoints (liquidity check & execution)
const submitRoute = require("./routes/submit");
const vaultRoutes = require("./routes/vaultRoutes");
const transactionsRoute = require("./routes/transactions");
const tradeRoutes = require("./routes/tradeRoutes");
const balanceRoutes = require("./routes/balanceRoutes");

const app = express();

// CORS setup for frontend domain
const corsOptions = {
  origin: "https://jordan702.github.io",
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false,
};
app.use(cors(corsOptions));

// Middleware to parse JSON and URL-encoded body content
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Ensure logs and uploads directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

ensureDirectoryExists(path.join(__dirname, "logs"));
ensureDirectoryExists(path.join(__dirname, "uploads"));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB file size limit
});

// ✅ Mount API routes
app.use("/api/transactions", transactionsRoute);
app.use("/api/swap", drtradeRoutes); // endpoints for liquidity check & execution trade
app.use("/api/verify", submitRoute);
app.use("/api/vault", vaultRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/balance", balanceRoutes);

// ✅ Liquidity Data API Route
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

// ✅ Serve static frontend files
const frontendPath = path.resolve(__dirname, "../drtv1-frontend");
app.use(express.static(frontendPath));

// ✅ Serve frontend UI pages for specific routes
app.get(["/approve", "/swap"], (req, res) => {
  res.sendFile(path.join(frontendPath, "drtrade.html"));
});

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.send("✅ DRTv1 Backend API is live 🚀");
});

// ✅ Dashboard & Logs API routes
app.get("/api/dashboard", (req, res) => {
  const logPath = path.resolve(__dirname, "logs/submissions.json");
  try {
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({
      error: "Failed to load submission logs",
      details: err.message,
    });
  }
});

app.get("/api/swap", (req, res) => {
  const logPath = path.resolve(__dirname, "logs/swap.json");
  try {
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({
      error: "Failed to load swap logs",
      details: err.message,
    });
  }
});

app.get('/price', async (req, res) => {
  const cmcId = req.query.cmc_id;

  if (!cmcId) {
    return res.status(400).json({ error: 'Missing cmc_id' });
  }

  try {
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmcId}`,
      {
        headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY }
      }
    );
    const price = response.data.data[cmcId].quote.USD.price;
    res.json({ price });
  } catch (error) {
    console.error('CMC API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch price from CMC' });
  }
});


// ✅ Global error handler middleware
app.use((err, req, res, next) => {
  console.error("🌐 Global Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});
