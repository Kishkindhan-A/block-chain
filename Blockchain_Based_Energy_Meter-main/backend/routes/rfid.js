const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { normalizeCardUid, buildTapResult } = require('../utils/rfid');
const apiKeyAuth = require('../middleware/auth');

router.post('/rfid/authorize', apiKeyAuth, async (req, res) => {
  const { meter_id, card_uid, owner_name } = req.body;

  if (!meter_id || !card_uid) {
    return res.status(400).json({
      success: false,
      error: 'meter_id and card_uid are required.'
    });
  }

  try {
    const normalizedUid = normalizeCardUid(card_uid);
    if (!normalizedUid) {
      return res.status(400).json({
        success: false,
        error: 'card_uid is invalid.'
      });
    }

    const result = await pool.query(
      `SELECT meter_id, status FROM rfid_cards WHERE card_uid = $1`,
      [normalizedUid]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        authorized: false,
        transfer_allowed: false,
        message: 'RFID card is not registered for this system.'
      });
    }

    const card = result.rows[0];
    const tapResult = buildTapResult({
      meter_id,
      card_uid: normalizedUid,
      registered_meter_id: card.meter_id,
      status: card.status
    });

    if (tapResult.authorized) {
      await pool.query(
        `UPDATE rfid_cards SET last_seen = CURRENT_TIMESTAMP, owner_name = COALESCE($2, owner_name) WHERE card_uid = $1`,
        [normalizedUid, owner_name || null]
      );
    }

    return res.json({
      success: true,
      ...tapResult,
      card_uid: normalizedUid,
      registered_meter_id: card.meter_id
    });
  } catch (err) {
    console.error('❌ RFID authorization error:', err.message);
    res.status(500).json({ success: false, error: 'RFID verification failed.', detail: err.message });
  }
});

router.post('/rfid/register', apiKeyAuth, async (req, res) => {
  const { card_uid, meter_id, owner_name } = req.body;

  if (!card_uid || !meter_id) {
    return res.status(400).json({
      success: false,
      error: 'card_uid and meter_id are required.'
    });
  }

  try {
    const normalizedUid = normalizeCardUid(card_uid);

    await pool.query(
      `INSERT INTO rfid_cards (card_uid, meter_id, owner_name, status, last_seen)
       VALUES ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP)
       ON CONFLICT (card_uid)
       DO UPDATE SET meter_id = EXCLUDED.meter_id, owner_name = EXCLUDED.owner_name, status = 'ACTIVE', last_seen = CURRENT_TIMESTAMP`,
      [normalizedUid, meter_id, owner_name || null]
    );

    res.status(201).json({
      success: true,
      message: 'RFID card registered successfully.',
      card_uid: normalizedUid,
      meter_id
    });
  } catch (err) {
    console.error('❌ RFID registration error:', err.message);
    res.status(500).json({ success: false, error: 'RFID registration failed.', detail: err.message });
  }
});

router.get('/rfid/cards', apiKeyAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT card_uid, meter_id, owner_name, status, last_seen FROM rfid_cards ORDER BY last_seen DESC NULLS LAST`);
    res.json({
      success: true,
      count: result.rows.length,
      cards: result.rows
    });
  } catch (err) {
    console.error('❌ RFID cards fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Unable to fetch RFID cards.', detail: err.message });
  }
});

module.exports = router;
