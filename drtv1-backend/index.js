// Load environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Initialize Express app
const app = express();

// CORS setup for frontend domain
const corsOptions = {
  origin: 'https://jordan702.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
};
app.use(cors(corsOptions));

// Middleware to handle JSON and form data
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure uploads folder exists (for multer)
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Setup multer (can be moved to route if needed)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// API Route
const submitRoute = require('./routes/submit');
app.use('/api/verify', submitRoute);

// Health check
app.get('/', (req, res) => {
  res.send('✅ DRTv1 Backend API is live 🚀');
});
app.get('/api/dashboard', (req, res) => {
  try {
    const logPath = path.resolve(__dirname, 'logs/submissions.json');
    const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard data', details: err.message });
  }
});
// Global error handler (optional)
app.use((err, req, res, next) => {
  console.error('🌐 Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});

