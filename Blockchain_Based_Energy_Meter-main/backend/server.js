// ============================================================
// server.js – Enargy Backend Entry Point
// Node.js + Express server that:
//   • Receives ESP32 readings via REST API
//   • Stores data in PostgreSQL
//   • Sends data to Ethereum blockchain via ethers.js
//   • Serves the React frontend build (optional)
// ============================================================

require('dotenv').config(); // Load .env variables first
const express = require('express');
const cors    = require('cors');

// ── Route Modules ──────────────────────────────────────────
const energyRoutes  = require('./routes/energy');
const paymentRoutes = require('./routes/payment');
const billingRoutes = require('./routes/billing');

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Global Middleware
// ============================================================

// Allow requests from the React dashboard (localhost:3000)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));

// Parse JSON bodies (required for ESP32 POST data)
app.use(express.json());

// ============================================================
// Health Check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status:  'running',
    service: 'Enargy Backend',
    version: '1.0.0',
    time:    new Date().toISOString(),
    endpoints: [
      'POST /api/energy',
      'GET  /api/readings',
      'GET  /api/meter/:id',
      'GET  /api/bill/:meterId',
      'GET  /api/blockchain',
      'POST /api/payment/order',
      'POST /api/payment/verify',
      'GET  /api/payment/:meterId',
    ]
  });
});

// ============================================================
// API Routes
// All routes are prefixed with /api
// ============================================================
app.use('/api', energyRoutes);
app.use('/api', paymentRoutes);
app.use('/api', billingRoutes);

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ============================================================
// Global Error Handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.', detail: err.message });
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   ⚡ Enargy Backend Server Running ⚡   ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║   URL: http://0.0.0.0:${PORT}             ║`);
  console.log('╚═══════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
// Force nodemon restart to inject 0x9... contract string into process.env
