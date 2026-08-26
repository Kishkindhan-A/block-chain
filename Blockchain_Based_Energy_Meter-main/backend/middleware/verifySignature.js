// ============================================================
// middleware/verifySignature.js – Verify SHA‑256 hash and ECDSA signature
// ------------------------------------------------------------
// Expected request body fields (added by validateReading):
//   meter_id, timestamp, voltage, current, power, power_factor,
//   energy_kwh, hash, signature, sequence
// ------------------------------------------------------------
// This middleware:
//   1. Retrieves the registered public key for the meter.
//   2. Re‑creates the canonical message (same as ESP32) and recomputes the hash.
//   3. Compares the received hash with the recomputed one.
//   4. Verifies the ECDSA signature using the stored public key.
//   5. Enforces replay protection via a monotonic sequence number.
//   6. Updates the meter_registry with the latest sequence and timestamp.
//   7. Attaches verification result to req.body.verification_status.
// ------------------------------------------------------------
// Uses Node.js built‑in crypto module (no extra dependencies).
// ============================================================

const crypto = require('crypto');
const pool = require('../db/pool');

/**
 * Re‑creates the exact message string that the ESP32 signs.
 * Must match the logic in the firmware (see energy_meter.ino).
 */
function buildCanonicalMessage(body) {
  const { meter_id, timestamp, voltage, current, power, power_factor, sequence } = body;
  // ESP32 concatenates raw numeric values via String() without formatting.
  return meter_id + timestamp + voltage.toString() + current.toString() + power.toString() + power_factor.toString() + sequence.toString();
}

/**
 * Verify the request payload.
 */
async function verifySignature(req, res, next) {
  const { meter_id, timestamp, voltage, current, power, power_factor, energy_kwh, hash, signature, sequence } = req.body;

  try {
    // 1️⃣ Fetch registered public key and last sequence
    const { rows } = await pool.query('SELECT public_key, algorithm, last_sequence FROM meter_registry WHERE meter_id = $1', [meter_id]);
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Meter not registered.' });
    }
    const { public_key, algorithm, last_sequence } = rows[0];

    // 2️⃣ Replay protection – sequence must be greater than previous
    // Log for debugging
    console.log('🔍 Replay check – last_sequence:', last_sequence, 'incoming sequence:', sequence);
    if (typeof last_sequence === 'number' && sequence <= last_sequence) {
      console.warn('⚠️ Replay detected – rejecting payload');
      return res.status(409).json({ error: 'Replay detected: sequence number not increasing.' });
    }

    // 3️⃣ Re‑compute hash of the canonical message (without sequence)
    const rawMessage = meter_id + timestamp + voltage.toString() + current.toString() + power.toString() + power_factor.toString();
    const recomputedHash = crypto.createHash('sha256').update(rawMessage).digest('hex');
    if (recomputedHash !== hash) {
      return res.status(400).json({ error: 'Hash mismatch.' });
    }

    // 4️⃣ Verify digital signature (ECDSA, base64 encoded)
    const messageToVerify = rawMessage + sequence.toString();
    const verifier = crypto.createVerify('SHA256');
    verifier.update(messageToVerify);
    verifier.end();

    const isValid = verifier.verify(public_key, Buffer.from(signature, 'base64'));
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid digital signature.' });
    }

    // 5️⃣ Update meter_registry with new sequence and last_seen timestamp
    // Use CURRENT_TIMESTAMP which works for both PostgreSQL and SQLite fallback
    await pool.query('UPDATE meter_registry SET last_sequence = $1, last_seen = CURRENT_TIMESTAMP WHERE meter_id = $2', [sequence, meter_id]);

    // Attach verification status for later DB insert
    req.body.verification_status = 'VALID';
    next();
  } catch (err) {
    console.error('❌ Signature verification error:', err.message);
    res.status(500).json({ error: 'Verification processing error.', detail: err.message });
  }
}

module.exports = verifySignature;
