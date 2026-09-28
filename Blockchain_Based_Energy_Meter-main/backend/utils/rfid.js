function normalizeCardUid(uid) {
  if (!uid || typeof uid !== 'string') return '';

  const cleaned = uid
    .toUpperCase()
    .replace(/[^A-Fa-f0-9]/g, '');

  return cleaned;
}

function buildTapResult({ meter_id, card_uid, registered_meter_id, status }) {
  const normalizedCard = normalizeCardUid(card_uid);
  const authorized = Boolean(
    meter_id &&
    registered_meter_id &&
    meter_id === registered_meter_id &&
    normalizedCard &&
    status === 'ACTIVE'
  );

  if (!authorized) {
    return {
      authorized: false,
      transfer_allowed: false,
      message: 'RFID card is not authorized for this meter. Transfer blocked.'
    };
  }

  return {
    authorized: true,
    transfer_allowed: true,
    message: 'RFID verified. Meter reading transfer authorized.'
  };
}

function validateMeterTapAccess({ meter_id, card_uid, registered_meter_id, status }) {
  return buildTapResult({
    meter_id,
    card_uid,
    registered_meter_id,
    status
  });
}

module.exports = {
  normalizeCardUid,
  buildTapResult,
  validateMeterTapAccess
};
