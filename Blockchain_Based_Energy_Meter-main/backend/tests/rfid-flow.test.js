const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeCardUid, buildTapResult, validateMeterTapAccess } = require('../utils/rfid');

test('RFID card IDs are normalized for consistent meter authorization', () => {
  assert.equal(normalizeCardUid(' aa-11-bb '), 'AA11BB');
  assert.equal(normalizeCardUid(' 12 34 '), '1234');
});

test('valid authorized taps return an approved transfer state', () => {
  const result = buildTapResult({
    meter_id: 'MTR001',
    card_uid: 'AA11BB',
    registered_meter_id: 'MTR001',
    status: 'ACTIVE'
  });

  assert.equal(result.authorized, true);
  assert.equal(result.transfer_allowed, true);
  assert.equal(result.message, 'RFID verified. Meter reading transfer authorized.');
});

test('invalid card-to-meter matches are rejected before transfer', () => {
  const result = buildTapResult({
    meter_id: 'MTR001',
    card_uid: 'BADCARD',
    registered_meter_id: 'MTR002',
    status: 'ACTIVE'
  });

  assert.equal(result.authorized, false);
  assert.equal(result.transfer_allowed, false);
  assert.ok(result.message.includes('not authorized'));
});

test('meter tap access is denied when card UID is missing or mismatched', () => {
  assert.equal(validateMeterTapAccess({
    meter_id: 'MTR001',
    card_uid: '',
    registered_meter_id: 'MTR001',
    status: 'ACTIVE'
  }).authorized, false);

  assert.equal(validateMeterTapAccess({
    meter_id: 'MTR001',
    card_uid: 'AA11BB',
    registered_meter_id: 'MTR002',
    status: 'ACTIVE'
  }).authorized, false);
});
