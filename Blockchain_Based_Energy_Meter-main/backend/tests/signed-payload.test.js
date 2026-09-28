const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const verifyModule = require('../middleware/verifySignature');

const buildCanonicalMessage = verifyModule.buildCanonicalMessage;

test('signature protocol includes energy and version in canonical payload', () => {
  const payload = {
    meter_id: 'MTR001',
    timestamp: '2026-09-26T12:00:00Z',
    voltage: 230.4,
    current: 3.5,
    power: 690.9,
    power_factor: 0.98,
    energy_kwh: 12.345,
    sequence: 42,
    signature_version: 1,
  };

  const message = buildCanonicalMessage(payload);
  assert.ok(message.includes('MTR001'));
  assert.ok(message.includes('12.345'));
  assert.ok(message.includes('42'));
  assert.ok(message.includes('signature_version=1'));
  assert.ok(!message.includes('undefined'));
});

test('recomputed hash matches the canonical payload that the device signs', () => {
  const payload = {
    meter_id: 'MTR001',
    timestamp: '2026-09-26T12:00:00Z',
    voltage: 230.4,
    current: 3.5,
    power: 690.9,
    power_factor: 0.98,
    energy_kwh: 12.345,
    sequence: 42,
    signature_version: 1,
  };

  const canonical = buildCanonicalMessage(payload);

  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  const keys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const signer = crypto.createSign('SHA256');
  signer.update(canonical);
  signer.end();
  const signature = signer.sign(keys.privateKey, 'base64');

  const verify = crypto.createVerify('SHA256');
  verify.update(canonical);
  verify.end();
  assert.equal(verify.verify(keys.publicKey, signature, 'base64'), true);
  assert.equal(hash.length, 64);
});
