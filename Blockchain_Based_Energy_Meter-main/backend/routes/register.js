// ============================================================
// routes/register.js – Meter Registration Route
// ------------------------------------------------------------
// POST /api/registerMeter
// Body: { meter_id: string, public_key: string, algorithm: string }
// Stores the device public key in the meter_registry table.
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const apiKeyAuth = require('../middleware/auth');

/**
 * Register a new ESP32 meter device.
 * The private key never leaves the device.
 */
router.post('/registerMeter', apiKeyAuth, async (req, res) => {
  const { meter_id, public_key, algorithm } = req.body;

  if (!meter_id || !public_key || !algorithm) {
    return res.status(400).json({ error: 'meter_id, public_key and algorithm are required.' });
  }

  try {
    const insertQuery = `
      INSERT INTO meter_registry (meter_id, public_key, algorithm, last_sequence, last_seen)
      VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)
      ON CONFLICT (meter_id) DO UPDATE SET 
        public_key = EXCLUDED.public_key,
        algorithm = EXCLUDED.algorithm,
        status = 'ACTIVE',
        registered_at = CURRENT_TIMESTAMP,
        last_sequence = 0,
        last_seen = CURRENT_TIMESTAMP`
    ;
    await pool.query(insertQuery, [meter_id, public_key, algorithm]);
    res.status(201).json({ success: true, message: 'Meter registered/updated.' });
  } catch (err) {
    console.error('❌ Meter registration error:', err.message);
    res.status(500).json({ error: 'Database error.', detail: err.message });
  }
});

module.exports = router;
