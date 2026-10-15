#pragma once
/*
 * Leitura do PZEM-004T nas duas "línguas":
 *  - v3.0  : Modbus-RTU (endereço 0xF8)
 *  - v1/v2 : protocolo antigo de 7 bytes (endereço 192.168.1.1)
 * Na partida (e depois de falhas seguidas) descobre sozinho a versão e a ordem dos fios TX/RX.
 */
#include <Arduino.h>
#include <Preferences.h>
#include <cmath>

struct PzemReading {
  float v = NAN, i = NAN, p = NAN, e = NAN, f = NAN, pf = NAN;  // e em kWh
};

class PzemMeter {
 public:
  enum Proto { NONE, V3, OLD };

  void begin(int rx, int tx, Preferences *prefs) {
    rx_ = rx; tx_ = tx; prefs_ = prefs;
    oldBaseWh_ = prefs_->getFloat("e0", 0);
    detect();
  }

  bool read(PzemReading &r) {
    bool ok = proto_ == V3 ? readV3(r) : proto_ == OLD ? readOld(r) : false;
    if (ok) { fails_ = 0; return true; }
    if (++fails_ >= 3) { fails_ = 0; detect(); }
    return false;
  }

  void resetEnergy() {
    if (proto_ == V3) {
      uint8_t m[4] = {0xF8, 0x42, 0, 0};
      addCrc(m, 2);
      send(m, 4);
      uint8_t buf[8]; recv(buf, 4, 300);
    } else if (proto_ == OLD) {  // protocolo antigo não tem "zerar": guardo o valor atual como base
      PzemReading r;
      if (readOld(r, true)) { oldBaseWh_ = lastOldWh_; prefs_->putFloat("e0", oldBaseWh_); }
    }
  }

  const char *protoName() const { return proto_ == V3 ? "v3" : proto_ == OLD ? "v1/v2" : "nenhum"; }

 private:
  int rx_, tx_;
  Proto proto_ = NONE;
  int fails_ = 0;
  Preferences *prefs_ = nullptr;
  float oldBaseWh_ = 0, lastOldWh_ = 0;

  void open(int rx, int tx) {
    Serial2.end();
    delay(20);
    Serial2.begin(9600, SERIAL_8N1, rx, tx);
    delay(50);
  }

  void detect() {
    int orders[2][2] = {{rx_, tx_}, {tx_, rx_}};
    PzemReading r;
    for (auto &o : orders) {
      open(o[0], o[1]);
      if (readV3(r)) { proto_ = V3; rx_ = o[0]; tx_ = o[1]; report(); return; }
      if (oldSetAddress() && readOld(r)) { proto_ = OLD; rx_ = o[0]; tx_ = o[1]; report(); return; }
    }
    proto_ = NONE;
    open(rx_, tx_);
    Serial.println("[pzem] sem resposta (v3 e v1/v2, nas duas ordens de fios)");
  }

  void report() {
    Serial.printf("[pzem] encontrado! protocolo %s, TX do PZEM no GPIO%d, RX do PZEM no GPIO%d\n", protoName(), rx_, tx_);
  }

  // ---------- comum ----------
  void send(const uint8_t *m, int n) {
    while (Serial2.available()) Serial2.read();
    Serial2.write(m, n);
    Serial2.flush();
  }
  int recv(uint8_t *buf, int want, int timeoutMs) {
    unsigned long t = millis();
    int n = 0;
    while (n < want && millis() - t < (unsigned long)timeoutMs) {
      if (Serial2.available()) buf[n++] = Serial2.read();
      else delay(1);
    }
    return n;
  }

  // ---------- v3 (Modbus) ----------
  static uint16_t crc16(const uint8_t *d, int n) {
    uint16_t c = 0xFFFF;
    for (int i = 0; i < n; i++) {
      c ^= d[i];
      for (int b = 0; b < 8; b++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1;
    }
    return c;
  }
  static void addCrc(uint8_t *m, int n) { uint16_t c = crc16(m, n); m[n] = c & 0xFF; m[n + 1] = c >> 8; }

  bool readV3(PzemReading &r) {
    uint8_t m[8] = {0xF8, 0x04, 0x00, 0x00, 0x00, 0x0A, 0, 0};
    addCrc(m, 6);
    send(m, 8);
    uint8_t b[25];
    if (recv(b, 25, 300) != 25 || b[1] != 0x04 || crc16(b, 23) != (uint16_t)(b[23] | (b[24] << 8))) return false;
    auto reg = [&](int k) -> uint32_t { return ((uint32_t)b[3 + 2 * k] << 8) | b[4 + 2 * k]; };
    r.v = reg(0) / 10.0f;
    r.i = (reg(1) | (reg(2) << 16)) / 1000.0f;
    r.p = (reg(3) | (reg(4) << 16)) / 10.0f;
    r.e = (reg(5) | (reg(6) << 16)) / 1000.0f;  // Wh -> kWh
    r.f = reg(7) / 10.0f;
    r.pf = reg(8) / 100.0f;
    return true;
  }

  // ---------- v1/v2 (antigo) ----------
  bool oldCmd(uint8_t cmd, uint8_t *data) {
    uint8_t m[7] = {cmd, 0xC0, 0xA8, 0x01, 0x01, 0x00, 0};
    for (int k = 0; k < 6; k++) m[6] += m[k];
    send(m, 7);
    uint8_t b[7];
    if (recv(b, 7, 500) != 7) return false;
    uint8_t sum = 0;
    for (int k = 0; k < 6; k++) sum += b[k];
    if (sum != b[6] || b[0] != (uint8_t)(cmd - 0x10)) return false;
    memcpy(data, b + 1, 5);
    return true;
  }
  bool oldSetAddress() { uint8_t d[5]; return oldCmd(0xB4, d); }

  bool readOld(PzemReading &r, bool energyOnly = false) {
    uint8_t d[5];
    if (!energyOnly) {
      if (!oldCmd(0xB0, d)) return false;
      r.v = (d[0] << 8) + d[1] + d[2] / 10.0f;
      if (!oldCmd(0xB1, d)) return false;
      r.i = (d[0] << 8) + d[1] + d[2] / 100.0f;
      if (!oldCmd(0xB2, d)) return false;
      r.p = (d[0] << 8) + d[1];
    }
    if (!oldCmd(0xB3, d)) return false;
    lastOldWh_ = ((uint32_t)d[0] << 16) + ((uint32_t)d[1] << 8) + d[2];
    r.e = fmaxf(0, lastOldWh_ - oldBaseWh_) / 1000.0f;
    // v1/v2 não mede frequência; fator de potência = P / (V * I)
    if (!energyOnly && r.v > 1 && r.i > 0.001f) r.pf = fminf(1.0f, r.p / (r.v * r.i));
    return true;
  }
};
