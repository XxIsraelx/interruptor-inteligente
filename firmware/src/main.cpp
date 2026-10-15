/*
 * Interruptor Inteligente — firmware ESP32
 * Lê o PZEM-004T v3, controla o relé e conversa com a API via MQTT.
 * Contrato de tópicos: docs/MQTT.md
 */
#include <Arduino.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>

#include <cmath>

#include "config.h"
#include "secrets.h"

// O PZEM é criado em setup(); se não responder, o firmware testa os pinos invertidos (fio TX/RX trocado).
PZEM004Tv30 *pzemPtr = nullptr;
#define pzem (*pzemPtr)
int pzemRx = PZEM_RX_PIN, pzemTx = PZEM_TX_PIN;
int pzemFails = 0;

void beginPzem(int rx, int tx) {
  if (pzemPtr) { delete pzemPtr; Serial2.end(); }
  pzemRx = rx; pzemTx = tx;
  pzemPtr = new PZEM004Tv30(Serial2, rx, tx);
  Serial.printf("[pzem] usando RX=GPIO%d (TX do PZEM) e TX=GPIO%d (RX do PZEM)\n", rx, tx);
}
Preferences prefs;

WiFiClient plainClient;
WiFiClientSecure tlsClient;
PubSubClient mqtt;

String deviceId;
String topicBase;  // interruptor/<id>
bool relayOn = false;
unsigned long lastTelemetry = 0;
unsigned long lastMqttAttempt = 0;

String topic(const char *suffix) { return topicBase + "/" + suffix; }

// ---------- Relé ----------

void applyRelay(bool on) {
  relayOn = on;
  digitalWrite(RELAY_PIN, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW);
  if (RESTORE_RELAY_STATE) prefs.putBool("relay", on);
}

void publishRelayState() {
  if (mqtt.connected()) mqtt.publish(topic("relay/state").c_str(), relayOn ? "ON" : "OFF", true);
}

// ---------- Telemetria ----------

void setOrNull(JsonDocument &doc, const char *key, float value, int decimals) {
  if (std::isnan(value)) {
    doc[key] = nullptr;
  } else {
    float m = powf(10, decimals);
    doc[key] = roundf(value * m) / m;
  }
}

void publishTelemetry() {
  JsonDocument doc;
  float volts = pzem.voltage();
  if (std::isnan(volts)) {
    if (++pzemFails % 3 == 0) {  // 3 falhas seguidas: tenta com os fios invertidos
      Serial.println("[pzem] sem resposta — testando TX/RX invertidos");
      beginPzem(pzemTx, pzemRx);
    }
  } else {
    pzemFails = 0;
  }
  setOrNull(doc, "v", volts, 1);
  setOrNull(doc, "i", pzem.current(), 3);
  setOrNull(doc, "p", pzem.power(), 1);
  setOrNull(doc, "e", pzem.energy(), 4);  // kWh acumulado
  setOrNull(doc, "f", pzem.frequency(), 1);
  setOrNull(doc, "pf", pzem.pf(), 2);
  doc["relay"] = relayOn;
  doc["rssi"] = WiFi.RSSI();
  doc["fw"] = FW_VERSION;

  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  mqtt.publish(topic("telemetry").c_str(), (const uint8_t *)buf, n, false);
  Serial.printf("[tele] %s\n", buf);
}

// ---------- MQTT ----------

void onMessage(char *t, byte *payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  msg.trim();
  msg.toUpperCase();
  String tp(t);
  Serial.printf("[mqtt] %s = %s\n", t, msg.c_str());

  if (tp.endsWith("/relay/set")) {
    if (msg == "ON") applyRelay(true);
    else if (msg == "OFF") applyRelay(false);
    else if (msg == "TOGGLE") applyRelay(!relayOn);
    else return;
    publishRelayState();
    publishTelemetry();  // atualiza a tela na hora
  } else if (tp.endsWith("/energy/reset")) {
    pzem.resetEnergy();
  }
}

void connectMqtt() {
  if (mqtt.connected() || millis() - lastMqttAttempt < 5000) return;
  lastMqttAttempt = millis();
  Serial.printf("[mqtt] conectando em %s:%d como %s...\n", MQTT_HOST, MQTT_PORT, deviceId.c_str());

  String will = topic("status");
  const char *user = strlen(MQTT_USER) ? MQTT_USER : nullptr;
  const char *pass = strlen(MQTT_PASS) ? MQTT_PASS : nullptr;
  if (mqtt.connect(deviceId.c_str(), user, pass, will.c_str(), 1, true, "offline")) {
    Serial.println("[mqtt] conectado");
    mqtt.publish(will.c_str(), "online", true);
    publishRelayState();
    mqtt.subscribe(topic("relay/set").c_str(), 1);
    mqtt.subscribe(topic("energy/reset").c_str(), 1);
    digitalWrite(LED_PIN, HIGH);
    publishTelemetry();
  } else {
    Serial.printf("[mqtt] falhou (estado %d)\n", mqtt.state());
    digitalWrite(LED_PIN, LOW);
  }
}

// ---------- Botão local ----------
// Clique no BOOT: liga/desliga o relé. Segurar 5 s: apaga o Wi-Fi salvo e reabre o portal de configuração.

bool lastButton = HIGH;
unsigned long lastButtonChange = 0;
unsigned long pressedAt = 0;

void handleButton() {
  bool b = digitalRead(BUTTON_PIN);
  if (b != lastButton && millis() - lastButtonChange > 50) {
    lastButtonChange = millis();
    lastButton = b;
    if (b == LOW) {
      pressedAt = millis();
    } else if (pressedAt && millis() - pressedAt < 3000) {  // clique curto
      applyRelay(!relayOn);
      publishRelayState();
      Serial.printf("[botao] relé %s\n", relayOn ? "ON" : "OFF");
      pressedAt = 0;
    }
  }
  if (b == LOW && pressedAt && millis() - pressedAt > 5000) {
    Serial.println("[botao] apagando Wi-Fi salvo e reiniciando...");
    WiFiManager wm;
    wm.resetSettings();
    delay(300);
    ESP.restart();
  }
}

// ---------- Wi-Fi ----------
// Sem Wi-Fi salvo, o ESP32 cria a rede "Interruptor-Setup": conecte o celular nela
// e escolha a rede da casa na página que abrir (ou acesse 192.168.4.1).

void setupWifi() {
  digitalWrite(LED_PIN, LOW);
  if (strlen(WIFI_SSID)) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  } else {
    WiFiManager wm;
    wm.setConfigPortalTimeout(300);
    wm.setTitle("Interruptor Inteligente");
    Serial.println("[wifi] sem conexão salva? abra a rede Interruptor-Setup no celular");
    if (!wm.autoConnect("Interruptor-Setup")) {
      Serial.println("[wifi] portal expirou, reiniciando");
      ESP.restart();
    }
  }
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    handleButton();
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "[wifi] ok, IP " + WiFi.localIP().toString() : "[wifi] sem conexão (tentando de novo)");
}

unsigned long lastWifiRetry = 0;

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED || millis() - lastWifiRetry < 10000) return;
  lastWifiRetry = millis();
  digitalWrite(LED_PIN, LOW);
  Serial.println("[wifi] reconectando...");
  WiFi.reconnect();
}

// ---------- Setup / loop ----------

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  prefs.begin("interruptor", false);
  beginPzem(PZEM_RX_PIN, PZEM_TX_PIN);
  applyRelay(RESTORE_RELAY_STATE ? prefs.getBool("relay", false) : false);

  WiFi.mode(WIFI_STA);
  // MAC gravado de fábrica (WiFi.macAddress() volta zerado antes do Wi-Fi iniciar no core 3.x)
  uint64_t mac = ESP.getEfuseMac();  // bytes em ordem little-endian
  char id[20];
  snprintf(id, sizeof(id), "esp32-%02x%02x%02x", (uint8_t)(mac >> 24), (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  deviceId = strlen(DEVICE_ID) ? String(DEVICE_ID) : String(id);
  topicBase = String(TOPIC_PREFIX) + "/" + deviceId;
  Serial.printf("\nInterruptor Inteligente %s — id %s\n", FW_VERSION, deviceId.c_str());

  if (MQTT_PORT == 8883) {
    // TODO produção: trocar por tlsClient.setCACert(<certificado raiz do broker>)
    tlsClient.setInsecure();
    mqtt.setClient(tlsClient);
  } else {
    mqtt.setClient(plainClient);
  }
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(15);

  setupWifi();
}

void loop() {
  handleButton();
  ensureWifi();
  if (WiFi.status() == WL_CONNECTED) {
    connectMqtt();
    mqtt.loop();
  }
  if (mqtt.connected() && millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    lastTelemetry = millis();
    publishTelemetry();
  }
}
