// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const multer = require('multer');
const path = require('path');

// Initialize Express app
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Import and use the verify route
const verifyRoute = require('./routes/verify');
app.use('/api/verify', upload.single('proof'), verifyRoute);

// Default route (for testing)
app.get('/', (req, res) => {
  res.send('DRTv1 Backend API is live 🚀');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DRTv1 backend running on port ${PORT}`);
});
