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

function normalizeNumber(value) {
  if (value === null || value === undefined) return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toString();
}

/**
 * Canonical payload used by the ESP32 and backend for hash/signature verification.
 * This must remain deterministic and free of undefined values.
 */
function buildCanonicalMessage(body = {}) {
  const signatureVersion = body.signature_version ?? 1;
  const meterId = String(body.meter_id ?? '');
  const timestamp = String(body.timestamp ?? '');
  const voltage = normalizeNumber(body.voltage);
  const current = normalizeNumber(body.current);
  const power = normalizeNumber(body.power);
  const powerFactor = normalizeNumber(body.power_factor);
  const energyKwh = normalizeNumber(body.energy_kwh);
  const sequence = String(body.sequence ?? 0);

  return [
    `meter_id=${meterId}`,
    `timestamp=${timestamp}`,
    `voltage=${voltage}`,
    `current=${current}`,
    `power=${power}`,
    `power_factor=${powerFactor}`,
    `energy_kwh=${energyKwh}`,
    `sequence=${sequence}`,
    `signature_version=${signatureVersion}`,
  ].join('|');
}

/**
 * Verify the request payload.
 */
async function verifySignature(req, res, next) {
  const { meter_id, hash, signature, sequence, signature_version } = req.body;

  try {
    const { rows } = await pool.query('SELECT public_key, last_sequence FROM meter_registry WHERE meter_id = $1', [meter_id]);
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Meter not registered.' });
    }

    const { public_key, last_sequence } = rows[0];
    if (typeof last_sequence === 'number' && sequence <= last_sequence) {
      return res.status(409).json({ error: 'Replay detected: sequence number not increasing.' });
    }

    const canonicalMessage = buildCanonicalMessage({ ...req.body, signature_version: signature_version ?? 1 });
    const recomputedHash = crypto.createHash('sha256').update(canonicalMessage).digest('hex');
    if (recomputedHash !== hash) {
      return res.status(400).json({ error: 'Hash mismatch.' });
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(canonicalMessage);
    verifier.end();

    const signatureBuffer = Buffer.from(signature, 'base64');
    const isValid = verifier.verify(public_key, signatureBuffer);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid digital signature.' });
    }

    await pool.query('UPDATE meter_registry SET last_sequence = $1, last_seen = CURRENT_TIMESTAMP WHERE meter_id = $2', [sequence, meter_id]);
    req.body.verification_status = 'VALID';
    next();
  } catch (err) {
    console.error('❌ Signature verification error:', err.message);
    res.status(500).json({ error: 'Verification processing error.', detail: err.message });
  }
}

module.exports = verifySignature;
module.exports.buildCanonicalMessage = buildCanonicalMessage;
