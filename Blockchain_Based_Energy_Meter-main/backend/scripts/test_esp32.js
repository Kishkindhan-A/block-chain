// ============================================================
// scripts/test_esp32.js – IoT ESP32 Smart Meter Simulator
//
// Simulates hardware energy meters (MTR001, MTR002, MTR003).
// Generates live voltage, current, power, and cumulative kWh readings,
// calculates SHA-256 data hashes on-device, and sends them to backend & blockchain.
// ============================================================

const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000/api/energy';
const API_KEY = 'EB_SECURE_KEY_123';

const METERS = [
  { id: 'MTR001', kwh: 14.50 },
  { id: 'MTR002', kwh: 28.10 },
  { id: 'MTR003', kwh: 42.75 }
];

console.log('⚡ ==================================================== ⚡');
console.log('📡 Starting ESP32 Hardware Simulator for Smart Meters');
console.log(`🌐 Target Endpoint: ${API_URL}`);
console.log('⚡ ==================================================== ⚡\n');

function generateData(meter) {
  const timestamp = new Date().toISOString().split('.')[0];
  const voltage   = parseFloat((Math.random() * (242 - 225) + 225).toFixed(2)); // 225V - 242V
  const current   = parseFloat((Math.random() * (3.5 - 0.2) + 0.2).toFixed(3)); // 0.2A - 3.5A
  const power     = parseFloat((voltage * current).toFixed(2));
  
  // kWh increment per 6 second interval
  const energyIncrement = (power * (6 / 3600)) / 1000;
  meter.kwh += energyIncrement;
  const energyKwh = parseFloat(meter.kwh.toFixed(4));

  // Generate SHA-256 hash (simulates hardware chip hashing)
  const dataString = `${meter.id}${timestamp}${voltage}${current}${power}${energyKwh}`;
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');

  return {
    meter_id:     meter.id,
    timestamp:    timestamp,
    voltage:      voltage,
    current:      current,
    power:        power,
    power_factor: 0.98,
    energy_kwh:   energyKwh,
    hash:         hash
  };
}

async function sendDataForMeter(meter) {
  const data = generateData(meter);
  try {
    const response = await axios.post(API_URL, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    API_KEY
      }
    });
    console.log(`✅ [${meter.id}] ${data.timestamp} | V: ${data.voltage}V | I: ${data.current}A | P: ${data.power}W | kWh: ${data.energy_kwh}`);
    console.log(`   └─ DB ID: ${response.data.db_id} | Blockchain Tx: ${response.data.blockchain_tx_hash?.substring(0, 18)}...\n`);
  } catch (err) {
    console.error(`❌ [${meter.id}] Data dispatch failed:`, err.response?.data?.error || err.message);
  }
}

// Send readings for all simulated meters sequentially every 6 seconds
let meterIndex = 0;
async function runSimulationCycle() {
  const meter = METERS[meterIndex];
  await sendDataForMeter(meter);
  meterIndex = (meterIndex + 1) % METERS.length;
}

// Start interval loop – dispatch 1 reading per second
setInterval(runSimulationCycle, 1000);
runSimulationCycle();
