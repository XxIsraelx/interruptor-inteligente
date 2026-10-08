# Contrato MQTT (ESP32 ⇄ Backend)

Tudo que o firmware, o simulador e a API precisam respeitar. Prefixo: `interruptor/`.
`{id}` é o identificador único do dispositivo (ex.: `esp32-a1b2c3`, derivado do MAC).

| Tópico | Quem publica | QoS | Retain | Payload |
|---|---|---|---|---|
| `interruptor/{id}/telemetry` | ESP32 | 0 | não | JSON de leitura (abaixo), a cada 5 s |
| `interruptor/{id}/status` | ESP32 (LWT) | 1 | **sim** | `online` / `offline` |
| `interruptor/{id}/relay/state` | ESP32 | 1 | **sim** | `ON` / `OFF` (estado real do relé) |
| `interruptor/{id}/relay/set` | Backend | 1 | não | `ON` / `OFF` / `TOGGLE` |
| `interruptor/{id}/energy/reset` | Backend | 1 | não | `1` (zera o acumulador do PZEM) |

## Broker

- O broker vem **embutido na API** (`MQTT_EMBEDDED_BROKER=true`, porta 1883).
- Local: o ESP32 conecta no IP do computador que roda `pnpm dev`, porta 1883.
- Railway: o ESP32 conecta no **TCP Proxy** do serviço (`xxxx.proxy.rlwy.net:<porta>`),
  com usuário/senha iguais a `MQTT_USERNAME` / `MQTT_PASSWORD` da API.

## Telemetria

```json
{
  "v": 127.1,    // tensão (V)
  "i": 5.21,     // corrente (A)
  "p": 650.3,    // potência ativa (W)
  "e": 2.403,    // energia acumulada no PZEM (kWh)
  "f": 60.0,     // frequência (Hz)
  "pf": 0.98,    // fator de potência
  "relay": true, // estado do relé no momento da leitura
  "rssi": -61,   // sinal Wi-Fi (dBm) — opcional
  "fw": "0.1.0"  // versão do firmware — opcional
}
```

Se o PZEM não responder (ex.: relé desligado e sensor sem alimentação no lado da carga),
o ESP32 envia os campos elétricos como `null`. A API registra só o estado.

## Regras

- O ESP32 conecta com **Last Will** `interruptor/{id}/status = offline` (retain) e publica
  `online` (retain) logo após conectar.
- Ao conectar, o ESP32 publica o estado atual do relé em `relay/state` (retain).
- O comando `relay/set` só é considerado aplicado quando chega o `relay/state` correspondente.
- O dispositivo se cadastra sozinho na API na primeira mensagem recebida.
