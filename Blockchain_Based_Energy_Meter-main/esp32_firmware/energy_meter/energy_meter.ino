#include "mbedtls/sha256.h"
#include "mbedtls/pk.h"
#include "mbedtls/ecdsa.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"
#include "mbedtls/base64.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>
#include <FS.h>
#include <SPIFFS.h>
#include <Preferences.h>


// ---------------- WIFI ----------------
const char *ssid = "1";
const char *password = "11111111";

// ---------------- SERVER ----------------
const char *serverName = "http://10.136.197.82:3000/api/energy";

// ---------------- AUTH ----------------
const char *apiKey = "EB_SECURE_KEY_123";

// ---------------- TIME (NTP) ----------------
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800; // India Time (UTC +5:30)
const int daylightOffset_sec = 0;

// ---------------- LCD ----------------
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ---------------- PINS ----------------
#define CURRENT_PIN 34
#define VOLTAGE_PIN 35

// ---------------- SETTINGS ----------------
String meterID = "MTR001";
bool testMode = false;
// Sequence number for replay protection (stored in NVS)
Preferences preferences;
unsigned long sequenceNumber = 0;

// mbedTLS contexts for key handling
mbedtls_pk_context pk;
mbedtls_entropy_context entropy;
mbedtls_ctr_drbg_context ctr_drbg;

// ---------------- ENERGY ----------------
float totalEnergy = 0;

// ---------------- WIFI CONNECT ----------------
void connectWiFi() {
  Serial.print("Connecting WiFi");
  lcd.clear();
  lcd.print("Connecting WiFi");

  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected!");
    lcd.clear();
    lcd.print("WiFi OK");
    
    // Sync Time after WiFi is connected
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.print("Syncing Time");
    struct tm timeinfo;
    int ntpRetry = 0;
    while (!getLocalTime(&timeinfo) && ntpRetry < 10) {
      Serial.print(".");
      delay(1000);
      ntpRetry++;
    }
    if (ntpRetry < 10) Serial.println("\nTime Synced!");
    else Serial.println("\nTime Sync Failed (Using Server Time)");
    
  } else {
    Serial.println("\nFailed!");
    lcd.clear();
    lcd.print("WiFi Fail");
  }
}

// ---------------- TIME ----------------
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
    return "N/A";

  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buffer);
}

// ---------------- HASH ----------------
String generateHash(String data) {
  byte hash[32];
  mbedtls_sha256((const unsigned char *)data.c_str(), data.length(), hash, 0);

  String result = "";
  for (int i = 0; i < 32; i++) {
    char str[3];
    sprintf(str, "%02x", hash[i]);
    result += str;
  }
  return result;
}

// ---------------- SENSOR ----------------
float readVoltage() {
  float sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(VOLTAGE_PIN);
    delayMicroseconds(200);
  }
  return (sum / 50.0 / 4095.0) * 3.3 * 100.0; // Scaled for demo
}

float readCurrent() {
  float sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(CURRENT_PIN);
    delayMicroseconds(200);
  }
  float avg = sum / 50.0;
  float current = ((avg / 4095.0) * 3.3 - 2.5) / 0.185;
  return fabs(current);
}

// ---------------- LCD ----------------
void displayData(float v, float i, float p) {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("V:");
  lcd.print(v, 2);

  lcd.setCursor(9, 0);
  lcd.print("I:");
  lcd.print(i, 2);

  lcd.setCursor(0, 1);
  lcd.print("P:");
  lcd.print(p, 1);

  lcd.setCursor(9, 1);
  lcd.print("M:");
  lcd.print(meterID);
}

// ---------------- SEND ----------------
void sendData(String payload) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    connectWiFi();
    return;
  }

  HTTPClient http;
  http.begin(serverName);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  int httpCode = http.POST(payload);

  Serial.print("HTTP: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }

  http.end();
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  lcd.init();
  lcd.backlight();

  // Initialize storage for keys and sequence
  if (!SPIFFS.begin(true)) {
    Serial.println("Failed to mount SPIFFS");
  }
  preferences.begin("meter", false);
  sequenceNumber = preferences.getULong("seq", 0);

  generateOrLoadKeyPair();
  // Initialize cryptographic contexts
  mbedtls_pk_init(&pk);
  mbedtls_entropy_init(&entropy);
  mbedtls_ctr_drbg_init(&ctr_drbg);

  // Seed the RNG
  const char *pers = "esp32_rng";
  int ret = mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy,
                                   (const unsigned char *)pers, strlen(pers));
  if (ret != 0) {
    Serial.printf("❌ RNG seed failed: -0x%04x\n", -ret);
  }

  generateOrLoadKeyPair();
  connectWiFi();
  // After WiFi is up, register the device public key with backend (once per boot)
  registerMeter();
}

// ---------------- LOOP ----------------
void loop() {

  float voltage, current, powerFactor;

  if (testMode) {
    voltage = random(2200, 2400) / 10.0;
    current = random(10, 200) / 100.0;
    powerFactor = random(92, 99) / 100.0;
  } else {
    voltage = readVoltage();
    current = readCurrent();
    powerFactor = 0.95; // Default for non-inductive loads in demo
  }

  // Calculate Power (W) and convert to kW for requested display
  float powerW = voltage * current * powerFactor;
  float powerKW = powerW / 1000.0;

  // ---- ENERGY (Cumulative kWh) ----
  totalEnergy += (powerKW * (10.0 / 3600.0));

  // ---- TIMESTAMP ----
  String timestamp = getTimestamp();
  String datePart = "N/A";
  String timePart = "N/A";
  
  if (timestamp != "N/A") {
    datePart = timestamp.substring(0, 10);
    timePart = timestamp.substring(11, 19);
  }

  // ---- SERIAL FORMAT ----
  Serial.print("V: "); Serial.print(voltage, 2);
  Serial.print(" | I: "); Serial.print(current, 2);
  Serial.print(" | P: "); Serial.print(powerW, 2);
  Serial.print(" | PF: "); Serial.print(powerFactor, 2);
  Serial.print(" | kWh: "); Serial.print(totalEnergy, 4);
  Serial.print(" | Date: "); Serial.print(datePart);
  Serial.print(" | Time: "); Serial.print(timePart);
  Serial.print(" | Meter ID: "); Serial.print(meterID);
  Serial.println(" |");

  // ---- HASH ----
  String raw = meterID + timestamp + String(voltage) + String(current) + String(powerW) + String(powerFactor);
  String hash = generateHash(raw);

  // ---- SIGNATURE ----
  sequenceNumber++;
  preferences.putULong("seq", sequenceNumber);
  String messageToSign = raw + String(sequenceNumber);
  String signature = signMessage(messageToSign);

  // ---- JSON ----
  StaticJsonDocument<512> doc;
  doc["meter_id"] = meterID;
  doc["timestamp"] = timestamp;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["power"] = powerW; 
  doc["power_factor"] = powerFactor;
  doc["energy_kwh"] = totalEnergy;
  doc["hash"] = hash;
  doc["signature"] = signature;
  doc["sequence"] = sequenceNumber;

  String jsonString;
  serializeJson(doc, jsonString);
  Serial.println(jsonString);

  // ---- LCD ----
  displayData(voltage, current, powerW);

  // ---- SEND ----
  sendData(jsonString);

  Serial.println("------------------------");

  delay(10000); // 10 seconds between readings
}


/**
 * Register the meter's public key with the backend.
 * Sends a POST to /api/registerMeter with JSON payload.
 */
void registerMeter() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi not connected – cannot register meter.");
    return;
  }

  // Load public key PEM from SPIFFS
  if (!SPIFFS.exists("/public_key.pem")) {
    Serial.println("⚠️ Public key file missing – cannot register.");
    return;
  }
  File pubFile = SPIFFS.open("/public_key.pem", FILE_READ);
  String pubKey = pubFile.readString();
  pubFile.close();

  // Build registration payload
  StaticJsonDocument<512> regDoc;
  regDoc["meter_id"] = meterID;
  regDoc["public_key"] = pubKey;
  regDoc["algorithm"] = "secp256r1";
  String regPayload;
  serializeJson(regDoc, regPayload);

  HTTPClient http;
  http.begin(String(serverName).replace("/api/energy", "/api/registerMeter")); // same host
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);
  int httpCode = http.POST(regPayload);
  Serial.print("📡 Register meter HTTP: ");
  Serial.println(httpCode);
  if (httpCode > 0) {
    String resp = http.getString();
    Serial.println(resp);
  }
  http.end();
}
// ============================================================
// Key Management Helpers
// ============================================================

/**
 * Load existing key pair from SPIFFS or generate a new one.
 * The private key stays on the device and is never transmitted.
 * The public key is stored in PEM format for later registration.
 */
void generateOrLoadKeyPair() {
  // Ensure SPIFFS is mounted (already done in setup)
  if (!SPIFFS.exists("/private_key.pem") || !SPIFFS.exists("/public_key.pem")) {
    Serial.println("🔑 Generating new EC key pair...");
    // Initialize PK context for EC key
    int ret = mbedtls_pk_setup(&pk, mbedtls_pk_info_from_type(MBEDTLS_PK_ECKEY));
    if (ret != 0) {
      Serial.printf("❌ PK setup failed: -0x%04x\n", -ret);
      return;
    }

    // Generate key (using secp256r1 curve – widely supported)
    ret = mbedtls_ecp_gen_key(MBEDTLS_ECP_DP_SECP256R1, mbedtls_pk_ec(pk), mbedtls_ctr_drbg_random, &ctr_drbg);
    if (ret != 0) {
      Serial.printf("❌ EC key generation failed: -0x%04x\n", -ret);
      return;
    }

    // Write private key PEM
    unsigned char privPem[1600];
    size_t privLen = 0;
    ret = mbedtls_pk_write_key_pem(&pk, privPem, sizeof(privPem));
    if (ret != 0) {
      Serial.printf("❌ Write private PEM failed: -0x%04x\n", -ret);
      return;
    }
    File privFile = SPIFFS.open("/private_key.pem", FILE_WRITE);
    privFile.write(privPem, strlen((char *)privPem));
    privFile.close();

    // Write public key PEM
    unsigned char pubPem[1600];
    size_t pubLen = 0;
    ret = mbedtls_pk_write_pubkey_pem(&pk, pubPem, sizeof(pubPem));
    if (ret != 0) {
      Serial.printf("❌ Write public PEM failed: -0x%04x\n", -ret);
      return;
    }
    File pubFile = SPIFFS.open("/public_key.pem", FILE_WRITE);
    pubFile.write(pubPem, strlen((char *)pubPem));
    pubFile.close();
    Serial.println("✅ Key pair generated and stored.");
  } else {
    Serial.println("🔑 Loading existing EC key pair from SPIFFS...");
    // Load private key PEM
    File privFile = SPIFFS.open("/private_key.pem", FILE_READ);
    size_t size = privFile.size();
    unsigned char *privBuf = (unsigned char *)malloc(size + 1);
    privFile.read(privBuf, size);
    privBuf[size] = '\0';
    privFile.close();
    int ret = mbedtls_pk_parse_key(&pk, privBuf, size + 1, nullptr, 0);
    free(privBuf);
    if (ret != 0) {
      Serial.printf("❌ Parse private key failed: -0x%04x\n", -ret);
      return;
    }
    Serial.println("✅ Private key loaded.");
  }
}

/**
 * Sign a message using the device's private EC key.
 * Returns a base64‑encoded signature string.
 */
String signMessage(const String &msg) {
  // Hash the message first
  unsigned char hash[32];
  mbedtls_sha256((const unsigned char *)msg.c_str(), msg.length(), hash, 0);

  // Sign the hash (ECDSA)
  unsigned char sig[512];
  size_t sigLen = 0;
  int ret = mbedtls_pk_sign(&pk, MBEDTLS_MD_SHA256, hash, 0, sig, &sigLen,
                             mbedtls_ctr_drbg_random, &ctr_drbg);
  if (ret != 0) {
    Serial.printf("❌ Signing failed: -0x%04x\n", -ret);
    return String();
  }

  // Encode signature as base64 for transmission
  size_t b64Len = 0;
  unsigned char b64Buf[1024];
  ret = mbedtls_base64_encode(b64Buf, sizeof(b64Buf), &b64Len, sig, sigLen);
  if (ret != 0) {
    Serial.printf("❌ Base64 encode failed: -0x%04x\n", -ret);
    return String();
  }
  return String((char *)b64Buf);
}
