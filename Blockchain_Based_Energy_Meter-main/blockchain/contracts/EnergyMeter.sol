// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
// EnergyMeter.sol – Smart Contract for Immutable Energy Storage
//
// This contract stores energy meter readings on the Ethereum
// blockchain so they cannot be tampered with.
//
// NOTE: Solidity has no float types. All float values from the
// ESP32 are scaled by 1000 in the backend before calling this
// contract (e.g., 2.59 V → 2590). Divide by 1000 when reading.
// ============================================================

contract EnergyMeter {

    // ── Data Structure ──────────────────────────────────────
    struct Reading {
        string  meterId;    // Meter ID (e.g., "MTR001")
        uint256 voltage;    // Voltage × 1000 (e.g., 2590 = 2.590 V)
        uint256 current;    // Current × 1000 (e.g., 430  = 0.430 A)
        uint256 power;      // Power × 1000   (e.g., 1130 = 1.130 W or kW depending on scale)
        uint256 powerFactor; // PF × 1000     (e.g., 950 = 0.950)
        uint256 energy;     // Energy × 1000  (kWh × 1000)
        string  timestamp;  // ISO timestamp string from ESP32
        string  hash;       // Integrity hash from ESP32
        address sender;     // Who submitted this reading (backend wallet)
        uint256 blockTime;  // Block timestamp when mined
    }

    // ── State Variables ─────────────────────────────────────
    address public owner;               // Contract deployer
    Reading[] private readings;         // All stored readings
    uint256   public readingCount;      // Total number of readings

    // ── Events (for off-chain listeners) ────────────────────
    event ReadingStored(
        uint256 indexed readingId,
        string  meterId,
        uint256 energy,
        string  timestamp,
        address sender
    );

    // ── Constructor ──────────────────────────────────────────
    constructor() {
        owner = msg.sender; // Deployer becomes owner
    }

    // ── Modifiers ────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this.");
        _;
    }

    // ============================================================
    // storeReading – Called by backend after each ESP32 reading
    // Parameters are scaled integers (float × 1000)
    // ============================================================
    function storeReading(
        string memory meterId,
        uint256 voltage,
        uint256 current,
        uint256 power,
        uint256 powerFactor,
        uint256 energy,
        string memory timestamp,
        string memory hash
    ) external {
        // Create a new Reading struct and push it to the array
        readings.push(Reading({
            meterId:     meterId,
            voltage:     voltage,
            current:     current,
            power:       power,
            powerFactor: powerFactor,
            energy:      energy,
            timestamp:   timestamp,
            hash:        hash,
            sender:      msg.sender,          // backend wallet address
            blockTime:   block.timestamp      // Unix timestamp of the block
        }));

        readingCount++;

        // Emit event so frontend/backend can listen without polling
        emit ReadingStored(readingCount - 1, meterId, energy, timestamp, msg.sender);
    }

    // ============================================================
    // getReadings – Returns ALL stored readings
    // Use with care on large datasets; use getReadingById for pagination
    // ============================================================
    function getReadings() external view returns (Reading[] memory) {
        return readings;
    }

    // ============================================================
    // getReadingById – Returns a single reading by index
    // ============================================================
    function getReadingById(uint256 index) external view returns (Reading memory) {
        require(index < readings.length, "Index out of bounds.");
        return readings[index];
    }

    // ============================================================
    // getReadingCount – Returns number of stored readings
    // ============================================================
    function getReadingCount() external view returns (uint256) {
        return readingCount;
    }
}
