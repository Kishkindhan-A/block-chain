// ============================================================
// routes/energy.js – Energy Reading Routes
//
// POST /api/energy         → Receive reading from ESP32
// GET  /api/readings       → Get all readings (with optional limit)
// GET  /api/meter/:id      → Get readings for a specific meter
// GET  /api/bill/:meterId  → Calculate electricity bill
// GET  /api/blockchain     → Fetch all readings from blockchain
// ============================================================

const express       = require('express');
const router        = express.Router();
const pool          = require('../db/pool');
const apiKeyAuth    = require('../middleware/auth');
const validateReading = require('../middleware/validateReading');
const { storeReadingOnChain, getAllReadingsFromChain } = require('../blockchain/client');
const { calculateBill } = require('../utils/tariff');

// ============================================================
// POST /api/energy
// Receives JSON from ESP32, stores in DB, then on blockchain.
// Headers required: x-api-key
// ============================================================
router.post('/energy', apiKeyAuth, validateReading, async (req, res) => {
  const { meter_id, timestamp, voltage, current, power, power_factor, energy_kwh, hash } = req.body;

  try {
    // If ESP32 fails to grab time, it sends 'N/A', which breaks PostgreSQL's timestamp type
    const validTimestamp = timestamp === 'N/A' ? new Date().toISOString() : timestamp;
    req.body.timestamp = validTimestamp; // update body for blockchain

    // ── STEP 1: Process & Store Data on Blockchain FIRST ──────
    console.log(`📡 Sending to blockchain FIRST (Hash + Tx)...`);
    const txHash = await storeReadingOnChain(req.body);

    if (!txHash) {
      throw new Error("Blockchain transaction failed to produce a hash.");
    }
    console.log(`🔗 Blockchain Data Stored! TX: ${txHash}`);

    // ── STEP 2: Store Ref & Indexed Data in PostgreSQL ────────
    const insertQuery = `
      INSERT INTO energy_readings
        (meter_id, timestamp, voltage, current, power, power_factor, energy_kwh, hash, blockchain_tx_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const dbResult = await pool.query(insertQuery, [
      meter_id, validTimestamp, voltage, current, power, power_factor, energy_kwh, hash, txHash
    ]);
    const newId = dbResult.rows[0].id;
    console.log(`📥 Reading mapped to PostgreSQL DB with id=${newId}`);

    // ── STEP 3: Respond to ESP32 ────────────────────────────
    res.status(201).json({
      success: true,
      message: "Data securely stored on Blockchain and Indexed in DB.",
      blockchain_tx_hash: txHash,
      db_id: newId
    });

  } catch (err) {
    console.error('❌ POST /api/energy error:', err.message);
    res.status(500).json({ error: 'Internal server error.', detail: err.message });
  }
});

// ============================================================
// GET /api/readings
// Returns all readings, newest first. Supports ?limit=N
// ============================================================
router.get('/readings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100; // Default last 100 readings

    const result = await pool.query(
      `SELECT * FROM energy_readings ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );

    let readings = result.rows;

    // ── PostgreSQL -> Blockchain (Verify Retrieval) ──
    try {
      const chainData = await getAllReadingsFromChain();
      readings = readings.map(dbRow => {
        const verified = chainData.some(c => c.hash === dbRow.hash);
        return { ...dbRow, verified_by_blockchain: verified };
      });
    } catch (err) {
      console.warn('Blockchain verification skipped/failed:', err.message);
    }

    res.json({
      success: true,
      count: readings.length,
      readings: readings
    });

  } catch (err) {
    console.error('❌ GET /api/readings error:', err.message);
    res.status(500).json({ error: 'Database error.', detail: err.message });
  }
});

// ============================================================
// GET /api/meter/:id
// Returns all readings for a specific meter ID
// ============================================================
router.get('/meter/:id', async (req, res) => {
  try {
    const meterId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM energy_readings WHERE meter_id = $1 ORDER BY timestamp DESC`,
      [meterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No readings found for meter ${meterId}` });
    }

    let readings = result.rows;

    // ── PostgreSQL -> Blockchain (Verify Retrieval) ──
    try {
      const chainData = await getAllReadingsFromChain();
      readings = readings.map(dbRow => {
        const verified = chainData.some(c => c.hash === dbRow.hash);
        return { ...dbRow, verified_by_blockchain: verified };
      });
    } catch (err) {
      console.warn('Blockchain verification skipped/failed:', err.message);
    }

    res.json({
      success: true,
      meter_id: meterId,
      count: readings.length,
      readings: readings
    });

  } catch (err) {
    console.error('❌ GET /api/meter/:id error:', err.message);
    res.status(500).json({ error: 'Database error.', detail: err.message });
  }
});

// ============================================================
// GET /api/bill/:meterId
// Calculates the electricity bill based on total kWh consumed.
//
// Slab system (Indian domestic tariff):
//   0–100 kWh      → ₹1.5 / kWh
//   101–300 kWh    → ₹3.0 / kWh
//   301–500 kWh    → ₹5.0 / kWh
//   Above 500 kWh  → ₹7.0 / kWh
// ============================================================
router.get('/bill/:meterId', async (req, res) => {
  try {
    const meterId = req.params.meterId;

    // Get the max (latest cumulative) energy_kwh for this meter
    const result = await pool.query(
      `SELECT MAX(energy_kwh) AS total_kwh FROM energy_readings WHERE meter_id = $1`,
      [meterId]
    );

    const totalKwh = parseFloat(result.rows[0].total_kwh) || 0;

    // ── Slab Billing Calculation (Using Utility) ───────────
    const { total_bill, breakdown } = calculateBill(totalKwh);

    res.json({
      success:    true,
      meter_id:   meterId,
      total_kwh:  parseFloat(totalKwh.toFixed(3)),
      total_bill,
      currency:   'INR',
      breakdown,
    });

  } catch (err) {
    console.error('❌ GET /api/bill/:meterId error:', err.message);
    res.status(500).json({ error: 'Database error.', detail: err.message });
  }
});

// ============================================================
// GET /api/blockchain
// Reads all readings directly from the blockchain smart contract
// ============================================================
router.get('/blockchain', async (req, res) => {
  try {
    const readings = await getAllReadingsFromChain();
    res.json({ success: true, count: readings.length, readings });
  } catch (err) {
    console.error('❌ GET /api/blockchain error:', err.message);
    res.status(500).json({ error: 'Blockchain read error.', detail: err.message });
  }
});

module.exports = router;
