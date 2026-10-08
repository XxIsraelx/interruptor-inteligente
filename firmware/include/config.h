#pragma once
// ===== Pinos (ESP32 DevKit V1) =====
#define PZEM_RX_PIN 16   // ESP32 RX2  <- TX do PZEM
#define PZEM_TX_PIN 17   // ESP32 TX2  -> RX do PZEM
#define RELAY_PIN 26     // IN do módulo relé
#define BUTTON_PIN 0     // botão BOOT da placa: liga/desliga local
#define LED_PIN 2        // LED azul da placa: aceso = conectado no MQTT

// A maioria dos módulos de relé com optoacoplador liga com nível BAIXO.
// Se o seu relé ficar invertido, troque para false.
#define RELAY_ACTIVE_LOW true

// Volta ao último estado do relé depois de uma queda de energia
#define RESTORE_RELAY_STATE true

// ===== Comportamento =====
#define TELEMETRY_INTERVAL_MS 5000
#define TOPIC_PREFIX "interruptor"
#define FW_VERSION "0.1.0"
