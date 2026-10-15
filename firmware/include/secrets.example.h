#pragma once
// Copie este arquivo para secrets.h e preencha. (secrets.h não vai para o git)

// Deixe WIFI_SSID vazio para configurar o Wi-Fi pelo celular (rede "Interruptor-Setup").
#define WIFI_SSID ""
#define WIFI_PASSWORD ""

// Local: IP do seu computador rodando "pnpm dev" (broker embutido na API), porta 1883
// Nuvem (Railway): host e porta do TCP Proxy do serviço, ex. "xxxx.proxy.rlwy.net", 12345,
//   com MQTT_USER/MQTT_PASS iguais às variáveis MQTT_USERNAME/MQTT_PASSWORD da API
// HiveMQ Cloud (opcional): "xxxxxxxx.s1.eu.hivemq.cloud", porta 8883 (TLS)
#define MQTT_HOST "192.168.0.10"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""

// Opcional: fixar o ID do dispositivo. Vazio = "esp32-" + final do MAC.
#define DEVICE_ID ""
