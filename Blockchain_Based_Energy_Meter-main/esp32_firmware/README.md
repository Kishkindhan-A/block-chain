# ⚡ Enargy IoT: ESP32 Energy Meter Firmware

This directory contains the C++/Arduino firmware for the ESP32-based smart meter. It interfaces with the PZEM-004T sensor to capture high-accuracy electricity data.

---

## 🛠️ Hardware Requirements

- **Microcontroller**: ESP32 DevKit V1
- **Sensor**: PZEM-004T (V3.0) AC Energy Meter
- **Connectivity**: WiFi (Built-in)
- **Wiring**:
    | PZEM Pin | ESP32 Pin | Role |
    | :--- | :--- | :--- |
    | VCC | 5V | Power |
    | RX | GPIO 17 (TX2) | Data Out |
    | TX | GPIO 16 (RX2) | Data In |
    | GND | GND | Ground |

---

## 💻 Software Setup

### 1. Arduino IDE Configuration
- **Board URL**: Add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` to Preferences.
- **Board Selection**: Tools → Board → ESP32 Dev Module.

### 2. Required Libraries
Install via Library Manager:
- `PZEM004Tv30` by Jakub Mandula

### 3. Firmware Configuration
Edit `energy_meter.ino` before uploading:
```cpp
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://192.168.1.XX:3000/api/energy"; 
```

---

## 🧪 Simulated Mode (No Hardware?)

If the PZEM sensor is not detected at boot, the firmware enters **Simulated Mode**. It will generate random but realistic energy data and send it to the backend. This allows developers to test the full stack (API, DB, Blockchain, UI) without physical hardware.

---

## 🔒 Security & Integrity

The firmware ensures data integrity using a **SHA256 Integrity Hash**:
1.  Read values (Voltage, Current, etc.).
2.  Generate a JSON string.
3.  Calculate a SHA256 hash of the JSON string.
4.  Send both the data and the hash to the backend.

The backend verifies this hash before committing data to the Blockchain.
