# Plano de desenvolvimento — Interruptor Inteligente

## Decisões

| Tema | Escolha | Por quê |
|---|---|---|
| Plataforma | **Web app PWA** (instala no celular pela tela inicial) | Um código só para celular e PC; sem loja de apps |
| Front | Next.js 15 + Tailwind 4 + Recharts | Stack que você já usa; gráficos prontos |
| Back | NestJS 11 + PostgreSQL | Mesmo padrão do AutoConnect |
| Tempo real | Socket.IO (API → navegador) | Leitura nova aparece na tela sem recarregar |
| ESP32 ⇄ nuvem | **MQTT** com broker **embutido na API** (aedes) | Leve, feito para IoT, funciona atrás de NAT/roteador de casa, tem Last Will (detecta offline). Embutido = sem conta/serviço extra; dá para trocar por HiveMQ Cloud só mudando variáveis |
| Banco | PostgreSQL + Drizzle ORM | Drizzle é só TypeScript (sem binários), SQL direto nas consultas de consumo |
| Deploy | Railway: **1 serviço** (API + web estático + broker) + Postgres | Mesma origem para front/API/WebSocket, custo menor; ESP32 entra pelo TCP Proxy |

## Arquitetura

```
                         ┌──────────── serviço "app" no Railway ────────────┐
 [Navegador / PWA] ─HTTPS─►  web estático (Next)  +  API NestJS  + Socket.IO  ├──► [Postgres]
                         │                         │  ▲                       │
                         │                 publish │  │ subscribe             │
                         │                         ▼  │                       │
                         │                 Broker MQTT embutido (:1883)       │
                         └─────────────────────────▲──┼───────────────────────┘
                                 TCP Proxy (MQTT)  │  │ relay/set
                                 telemetry/status  │  ▼
                                                [ESP32] ── UART ── [PZEM-004T]
                                                   └──── GPIO ──── [Relé] ── Aparelho
```

O navegador **nunca** fala direto com o ESP32: tudo passa pela API, que guarda histórico,
aplica autenticação e roda as automações.

## Modelo de dados

- **Device** — id (do MQTT), nome, local, online, relé, última leitura, potência máx. (regra)
- **Reading** — leitura a cada 5 s: V, A, W, kWh acumulado, Hz, FP
- **Event** — linha do tempo: ligou, desligou, ficou offline, comando enviado, automação executada
- **Schedule** — automação por horário: ligar/desligar às HH:mm em dias da semana

Consumo de um período = soma dos incrementos positivos do kWh acumulado do PZEM
(robusto a reset do contador).

## Fases

1. **MVP (esta entrega)** — monorepo, API com ingestão MQTT, cadastro automático do dispositivo,
   liga/desliga, dashboard em tempo real, gráfico de potência, consumo por hora/dia, custo em R$,
   linha do tempo de eventos, login com senha única, simulador do ESP32, firmware base.
2. **Automações** — agendamentos por horário (já incluído), regra "desligar se passar de X W",
   desligar após N minutos ligado.
3. **Vários dispositivos** — ranking de quem mais consome, consumo total da casa, agrupamento por cômodo.
4. **Deploy** ✅ — Railway (serviço único + Postgres), modo demonstração com 3 dispositivos simulados.
   Falta: ligar o ESP32 real pelo TCP Proxy e desligar `DEMO_SIMULATOR`.
5. **Extras** — exportar CSV, alerta de consumo, comparativo mês a mês, TLS no MQTT.
   (Compactação/retenção de leituras antigas já incluída.)

## Como desenvolver sem depender do hardware

Com `DEMO_SIMULATOR=true`, a API simula 3 ESP32 (ar-condicionado, geladeira, TV) que conversam
pelo broker exatamente como o hardware (mesmo contrato, ver `MQTT.md`). Com `DEMO_SEED=true`,
um banco vazio já começa com 7 dias de histórico para os gráficos.
