// Load environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Initialize Express app
const app = express();
const corsOptions = {
  origin: 'https://jordan702.github.io',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware to parse JSON
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Setup multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 } // Allow up to 20MB
});



// Import and use the /api/verify submission route
const submitRoute = require('./routes/submit');
app.use('/api/verify', submitRoute);

// Test route
app.get('/', (req, res) => {
  res.send('DRTv1 Backend API is live 🚀');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});

