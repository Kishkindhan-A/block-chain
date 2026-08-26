// ============================================================
// routes/payment.js – Razorpay Payment Routes
//
// POST /api/payment/order   → Create a Razorpay order
// POST /api/payment/verify  → Verify payment and update DB
// GET  /api/payment/:meterId → Get payment history for a meter
// ============================================================

const express  = require('express');
const router   = express.Router();
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const pool     = require('../db/pool');
require('dotenv').config();

// Initialise Razorpay with test credentials from .env
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_XXXXXXXXXXXXXXXX',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_secret',
});

// ============================================================
// POST /api/payment/order
// Creates a Razorpay order so the frontend can open the checkout
// Body: { meterId, amount, month }
// ============================================================
router.post('/payment/order', async (req, res) => {
  const { meterId, amount, month } = req.body;

  if (!meterId || !amount) {
    return res.status(400).json({ error: 'meterId and amount are required.' });
  }

  try {
    // Razorpay expects amount in paise (1 ₹ = 100 paise)
    const options = {
      amount:   Math.round(amount * 100),
      currency: 'INR',
      receipt:  `receipt_${meterId}_${Date.now()}`,
      notes:    { meterId, month: month || 'current' }
    };

    const order = await razorpay.orders.create(options);

    // Save pending payment record
    await pool.query(
      `INSERT INTO payments (meter_id, bill_month, amount, razorpay_order_id, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [meterId, month || 'current', amount, order.id]
    );

    res.json({
      success:  true,
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      process.env.RAZORPAY_KEY_ID, // Sent to frontend to open checkout
    });

  } catch (err) {
    console.error('❌ Payment order error:', err.message);
    res.status(500).json({ error: 'Could not create payment order.', detail: err.message });
  }
});

// ============================================================
// POST /api/payment/verify
// Called by frontend after Razorpay checkout success.
// Verifies the HMAC signature to confirm authenticity.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// ============================================================
router.post('/payment/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Generate expected HMAC-SHA256 signature
  const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_secret')
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed – invalid signature.' });
  }

  // Update payment record to "paid"
  await pool.query(
    `UPDATE payments SET status = 'paid', razorpay_payment_id = $1 WHERE razorpay_order_id = $2`,
    [razorpay_payment_id, razorpay_order_id]
  );

  console.log(`✅ Payment verified: ${razorpay_payment_id}`);
  res.json({ success: true, payment_id: razorpay_payment_id, message: 'Payment successful!' });
});

// ============================================================
// GET /api/payment/:meterId
// Returns all payment records for a meter
// ============================================================
router.get('/payment/:meterId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payments WHERE meter_id = $1 ORDER BY created_at DESC`,
      [req.params.meterId]
    );
    res.json({ success: true, payments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error.', detail: err.message });
  }
});

// ============================================================
// GET /api/payments
// Returns all payment records (for admin)
// ============================================================
router.get('/payments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payments ORDER BY created_at DESC`
    );
    res.json({ success: true, payments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error.', detail: err.message });
  }
});

module.exports = router;
