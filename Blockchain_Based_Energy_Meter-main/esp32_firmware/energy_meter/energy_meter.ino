#include "mbedtls/sha256.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>


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

  connectWiFi();
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
