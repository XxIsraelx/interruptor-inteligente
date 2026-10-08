# Firmware ESP32

> ⚠️ **Rede elétrica (127/220 V) mata.** Faça as ligações de AC com tudo desligado da tomada,
> use bornes isolados e uma caixa fechada. Teste primeiro com uma lâmpada, não com o ar-condicionado.

## Ligações

| PZEM-004T v3 (lado TTL) | ESP32 |
|---|---|
| 5V | **3V3** (funciona na maioria dos v3; se não ler nada, use 5V + divisor resistivo no TX do PZEM) |
| GND | GND |
| TX | GPIO16 (RX2) |
| RX | GPIO17 (TX2) |

| Módulo relé | ESP32 |
|---|---|
| VCC | 5V (VIN) |
| GND | GND |
| IN | GPIO26 |

Lado AC (esquema):

```
Fase ───┬──────────────► PZEM borne de tensão (L)
        │
        └──► COM do relé ──► NA do relé ──► passa por dentro do TC do PZEM ──► Aparelho (fase)
Neutro ─┬──────────────► PZEM borne de tensão (N)
        └─────────────────────────────────────────────────────────────────► Aparelho (neutro)
```

- O PZEM mede a tensão **antes** do relé, então continua lendo a tensão com o aparelho desligado (corrente = 0).
- O fio da fase da carga passa **por dentro** do anel (TC) do PZEM.
- Use o contato **NA** (normalmente aberto): se o ESP32 travar/desligar, o aparelho desliga.

## Gravando

1. Instale o VS Code + extensão **PlatformIO**.
2. Copie `include/secrets.example.h` para `include/secrets.h` e preencha Wi-Fi e MQTT
   - Local: `MQTT_HOST` = IP do seu Mac na rede e rode `pnpm dev` na raiz (o broker vem embutido na API).
   - Nuvem: host/porta do **TCP Proxy** do Railway + usuário/senha MQTT da API (ver README principal).
3. Abra a pasta `firmware/` no VS Code → **Upload** → **Monitor** (115200).
4. No monitor aparece o ID (`esp32-xxxxxx`). Ele surge sozinho no app na primeira leitura.

## Ajustes em `include/config.h`

- `RELAY_ACTIVE_LOW` — inverta se o relé ligar quando deveria desligar.
- `RESTORE_RELAY_STATE` — volta ao último estado depois de queda de energia.
- `TELEMETRY_INTERVAL_MS` — intervalo das leituras (padrão 5 s).

O botão **BOOT** da placa liga/desliga o relé localmente (funciona até sem Wi-Fi).

## TLS (opcional, ex.: HiveMQ Cloud)

O TCP Proxy do Railway é MQTT puro (sem TLS) protegido por usuário/senha — ok para a demo.
Com um broker TLS, a porta 8883 ativa TLS automaticamente. O código usa `setInsecure()` (criptografa, mas não valida
o certificado) — suficiente para a demo. Para validar, troque por `tlsClient.setCACert(...)`
com o certificado raiz do broker.
