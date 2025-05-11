require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS setup for frontend domain
const corsOptions = {
  origin: 'https://jordan702.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Multer setup for uploads (if used by /verify route)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// Routes
const submitRoute = require('./routes/submit');
const vaultRoutes = require('./routes/vaultRoutes');

app.use('/api/verify', submitRoute);
app.use('/api/vault', vaultRoutes);

// Serve the DRT Redemption HTML directly
app.get('/redeem', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/redeem.html'));
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ DRTv1 Backend API is live 🚀');
});

// Dashboard route for submission logs
app.get('/api/dashboard', (req, res) => {
  try {
    const logPath = path.resolve(__dirname, 'logs/submissions.json');
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard data', details: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🌐 Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});
