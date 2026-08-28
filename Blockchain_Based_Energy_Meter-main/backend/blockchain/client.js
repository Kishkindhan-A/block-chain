// ============================================================
// blockchain/client.js – Ethers.js Blockchain Client
// Connects to the deployed EnergyMeter smart contract.
// ============================================================

const { ethers } = require('ethers');
require('dotenv').config();

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is required. Configure it in backend/.env; never use a source-code fallback.');
}

if (!process.env.CONTRACT_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(process.env.CONTRACT_ADDRESS)) {
  throw new Error('A valid CONTRACT_ADDRESS is required in backend/.env.');
}

// ABI (Application Binary Interface) defines how to interact with the contract.
// Only include the functions we actually call from Node.js.
const CONTRACT_ABI = [
  // Store a reading on-chain
  "function storeReading(string meterId, uint256 voltage, uint256 current, uint256 power, uint256 powerFactor, uint256 energy, string timestamp, string hash) external",
  // Retrieve all stored readings
  "function getReadings() external view returns (tuple(string meterId, uint256 voltage, uint256 current, uint256 power, uint256 powerFactor, uint256 energy, string timestamp, string hash)[])",
  // Get total number of readings stored
  "function getReadingCount() external view returns (uint256)"
];

// Create a provider (connection to the Ethereum node / Hardhat local)
const provider = new ethers.JsonRpcProvider(
  process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8547'
);

// Create a wallet (signer) from private key – this pays gas fees
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Instantiate the contract via address + ABI + signer
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  CONTRACT_ABI,
  wallet
);

/**
 * Stores one energy reading on the blockchain.
 * Solidity only accepts integers, so floats are scaled by 1000.
 * @param {Object} data - Energy reading object from ESP32
 * @returns {string} Transaction hash
 */
let txQueue = Promise.resolve();

/**
 * Stores one energy reading on the blockchain.
 * Solidity only accepts integers, so floats are scaled by 1000.
 * @param {Object} data - Energy reading object from ESP32
 * @returns {string} Transaction hash
 */
function storeReadingOnChain(data) {
  const currentTask = txQueue.then(async () => {
    const voltageScaled      = Math.abs(Math.round(data.voltage       * 1000));
    const currentScaled      = Math.abs(Math.round(data.current       * 1000));
    const powerScaled        = Math.abs(Math.round(data.power         * 1000));
    const powerFactorScaled  = Math.abs(Math.round((data.power_factor || 0.98) * 1000));
    const energyScaled       = Math.abs(Math.round(data.energy_kwh    * 1000));

    console.log('📡 Sending reading to blockchain...');

    const nonce = await provider.getTransactionCount(wallet.address, 'pending');

    const tx = await contract.storeReading(
      data.meter_id,
      voltageScaled,
      currentScaled,
      powerScaled,
      powerFactorScaled,
      energyScaled,
      data.timestamp || new Date().toISOString(),
      data.hash,
      { nonce }
    );

    const receipt = await tx.wait(1);
    console.log('✅ Blockchain TX confirmed:', receipt.hash);
    return receipt.hash;
  });

  txQueue = currentTask.catch(() => {});
  return currentTask;
}

/**
 * Fetches all stored readings from the blockchain.
 * @returns {Array} Array of reading objects
 */
async function getAllReadingsFromChain() {
  const readings = await contract.getReadings();
  return readings.map(r => ({
    meterId:      r.meterId,
    voltage:      Number(r.voltage)      / 1000,
    current:      Number(r.current)      / 1000,
    power:        Number(r.power)        / 1000,
    power_factor: Number(r.powerFactor) / 1000,
    energy_kwh:   Number(r.energy)       / 1000,
    timestamp:    r.timestamp,
    hash:         r.hash,
  }));
}

module.exports = { storeReadingOnChain, getAllReadingsFromChain };
