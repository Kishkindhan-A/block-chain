// ============================================================
// middleware/auth.js – API Key Authentication Middleware
// Protects ESP32 endpoints from unauthorized access.
// ============================================================

require('dotenv').config();

/**
 * Express middleware that checks for a valid x-api-key header.
 * Usage: router.post('/energy', apiKeyAuth, handler)
 */
function apiKeyAuth(req, res, next) {
  const receivedKey = req.headers['x-api-key'];
  const validKey    = process.env.API_KEY || 'EB_SECURE_KEY_123';

  if (!receivedKey) {
    return res.status(401).json({ error: 'Missing API key. Add x-api-key header.' });
  }

  if (receivedKey !== validKey) {
    return res.status(403).json({ error: 'Invalid API key.' });
  }

  next(); // Key is valid, proceed to the route handler
}

module.exports = apiKeyAuth;
