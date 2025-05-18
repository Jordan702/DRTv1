require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const drtradeRoutes = require('./routes/drtradeRoute'); // Ensure this file exists and exports the expected router

const app = express();

// CORS setup for frontend domain
const corsOptions = {
  origin: 'https://jordan702.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
};
app.use(cors(corsOptions));

// Middleware to parse JSON and URL-encoded body content
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure logs and uploads directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
};

ensureDirectoryExists(path.join(__dirname, 'logs'));
ensureDirectoryExists(path.join(__dirname, 'uploads'));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Import additional routes for submissions, vault, and transactions
const submitRoute = require('./routes/submit');
const vaultRoutes = require('./routes/vaultRoutes');
const transactionsRoute = require('./routes/transactions');

// Mount routes
app.use('/api/transactions', transactionsRoute);
app.use('/api/swap', drtradeRoutes); // Trade routes are available under /api/swap
app.use('/api/verify', submitRoute);
app.use('/api/vault', vaultRoutes);

// Serve static frontend files from the ../drtv1-frontend directory
const frontendPath = path.resolve(__dirname, '../drtv1-frontend');
app.use(express.static(frontendPath));

// Serve drtrade.html for specific routes (allows using /approve or /swap for the frontend)
app.get(['/approve', '/swap'], (req, res) => {
  res.sendFile(path.join(frontendPath, 'drtrade.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('✅ DRTv1 Backend API is live 🚀');
});

// View submission dashboard logs
app.get('/api/dashboard', (req, res) => {
  const logPath = path.resolve(__dirname, 'logs/submissions.json');
  try {
    const logs = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath))
      : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to load submission logs',
      details: err.message,
    });
  }
});

// View redemption logs
app.get('/api/redemptions', (req, res) => {
  const logPath = path.resolve(__dirname, 'logs/redemptions.json');
  try {
    const logs = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath))
      : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to load redemption logs',
      details: err.message,
    });
  }
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('🌐 Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});
