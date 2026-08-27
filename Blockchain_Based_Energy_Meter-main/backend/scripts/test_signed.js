/**
 * Quick test script to generate a device key pair, register the meter, and send a
 * signed reading that will pass the new verification middleware.
 *
 * Run with: `node scripts/test_signed.js`
 */

// Load environment variables from the project root .env file.
// The script runs with cwd set to the backend folder, so we need to resolve the correct path.
const path = require('path');
// Load environment variables from the backend .env file (one level up from this script)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const axios = require('axios');
const crypto = require('crypto');

// Backend port is read from the .env file (default 3000). Use the same value here.
const API_URL = process.env.PORT ? `http://localhost:${process.env.PORT}/api` : 'http://localhost:3000/api';
console.log('🔧 Using API_URL:', API_URL);
const API_KEY = 'EB_SECURE_KEY_123';

// ---------------------------------------------------------------
// 1️⃣ Generate an EC key pair (secp256r1) – same curve used on ESP32
// ---------------------------------------------------------------
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // secp256r1
});

const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });

// Keep the simulator meter aligned with the consumer demo login.
const METER_ID = process.env.METER_ID || 'MTR001';

// ---------------------------------------------------------------
// 2️⃣ Register the meter public key with the backend
// ---------------------------------------------------------------
async function registerMeter() {
  try {
    const resp = await axios.post(`${API_URL}/registerMeter`, {
      meter_id: METER_ID,
      public_key: publicPem,
      algorithm: 'secp256r1'
    }, {
      headers: { 'x-api-key': API_KEY }
    });
    console.log('✅ Meter registered:', resp.data);
  } catch (err) {
    console.error('❌ Registration failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------
// 3️⃣ Build a signed reading payload
// ---------------------------------------------------------------
function buildSignedReading(seq) {
  const timestamp = new Date().toISOString();
  const voltage = 230.5;
  const current = 4.2;
  const power = voltage * current * 0.98; // using a fixed PF for demo
  const power_factor = 0.98;
  const energy_kwh = 123.4567;

  // Canonical message (without sequence) – must match ESP32 logic
  const raw = `${METER_ID}${timestamp}${voltage}${current}${power}${power_factor}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  // Message to sign = hash + sequence (as string)
  const messageToSign = raw + seq.toString();
  const sign = crypto.createSign('SHA256');
  sign.update(messageToSign);
  sign.end();
  const signatureDer = sign.sign(privatePem);
  const signatureB64 = signatureDer.toString('base64');

  return {
    meter_id: METER_ID,
    timestamp,
    voltage,
    current,
    power,
    power_factor,
    energy_kwh,
    hash,
    signature: signatureB64,
    sequence: seq
  };
}

// ---------------------------------------------------------------
// 4️⃣ Send the reading
// ---------------------------------------------------------------
async function sendReading(payload) {
  try {
    const resp = await axios.post(`${API_URL}/energy`, payload, {
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
    });
    console.log('✅ Reading accepted:', resp.data);
  } catch (err) {
    console.error('❌ Reading rejected:', err.response?.data || err.message);
  }
}

// ---------------------------------------------------------------
// Main flow – continuous simulation until the process is stopped
// ---------------------------------------------------------------
(async () => {
  await registerMeter();
  console.log('🔁 Starting continuous reading simulation (press Ctrl+C to stop)…');
  let seq = 1;
  // Run indefinitely; each iteration sends a signed reading and waits briefly.
  while (true) {
    const payload = buildSignedReading(seq);
    console.log(`📤 Sending reading #${seq}`);
    await sendReading(payload);
    // Small delay between readings to simulate real‑time intervals (500 ms)
    await new Promise(res => setTimeout(res, 500));
    seq++;
  }
})();
