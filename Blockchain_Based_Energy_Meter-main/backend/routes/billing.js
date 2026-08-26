const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { calculateBill } = require('../utils/tariff');

/**
 * POST /api/billing/generate
 * Generates a bill for a specific meter based on a date range.
 * Logic: Finds max and min kwh in range, calculates difference, applies tariff.
 */
router.post('/billing/generate', async (req, res) => {
  const { meter_id, start_date, end_date } = req.body;

  if (!meter_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'meter_id, start_date, and end_date are required.' });
  }

  try {
    // 1. Get the readings within the date range
    const consumptionQuery = `
      SELECT 
        MIN(energy_kwh) as start_kwh, 
        MAX(energy_kwh) as end_kwh 
      FROM energy_readings 
      WHERE meter_id = $1 AND timestamp BETWEEN $2 AND $3
    `;
    const result = await pool.query(consumptionQuery, [meter_id, start_date, end_date]);

    if (!result.rows[0].start_kwh || !result.rows[0].end_kwh) {
      return res.status(404).json({ error: 'No energy readings found for this meter in the selected date range.' });
    }

    const startKwh = parseFloat(result.rows[0].start_kwh);
    const endKwh = parseFloat(result.rows[0].end_kwh);
    const consumedKwh = endKwh - startKwh;

    // 2. Calculate bill amount
    const { total_bill, breakdown } = calculateBill(consumedKwh);

    // 3. Generate label for bill month/period
    const period = `${new Date(start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date(end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // 4. Record the bill in the payments table
    await pool.query(
      `INSERT INTO payments (meter_id, bill_month, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [meter_id, period, total_bill]
    );

    res.json({
      success: true,
      data: {
        meter_id,
        period,
        consumed_kwh: parseFloat(consumedKwh.toFixed(3)),
        total_bill,
        breakdown
      }
    });

  } catch (err) {
    console.error('❌ Error generating bill:', err.message);
    res.status(500).json({ error: 'Failed to generate bill.', detail: err.message });
  }
});

module.exports = router;
