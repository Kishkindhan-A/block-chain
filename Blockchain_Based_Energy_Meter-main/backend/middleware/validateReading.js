// ============================================================
// middleware/validateReading.js – Input Validation Middleware
// Ensures ESP32 data contains all required fields.
// ============================================================

/**
 * Validates the incoming energy reading body.
 * Rejects requests with missing or invalid fields.
 */
function validateReading(req, res, next) {
  const { meter_id, timestamp, voltage, current, power, power_factor, energy_kwh, hash, signature, sequence } = req.body;

  // Check all required fields are present
  if (!meter_id || !timestamp || voltage == null || current == null ||
      power == null || power_factor == null || energy_kwh == null || !hash || !signature || sequence == null) {
    return res.status(400).json({
      error: 'Missing required fields.',
      required: ['meter_id', 'timestamp', 'voltage', 'current', 'power', 'power_factor', 'energy_kwh', 'hash', 'signature', 'sequence']
    });
  }

  // Basic type validation
  if (typeof voltage !== 'number' || typeof current !== 'number' ||
      typeof power !== 'number'   || typeof power_factor !== 'number' || typeof energy_kwh !== 'number' || typeof sequence !== 'number') {
    return res.status(400).json({ error: 'Invalid data types for numeric fields.' });
  }

  next(); // All good, proceed
}

module.exports = validateReading;
