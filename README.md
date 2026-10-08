# Interruptor Inteligente

Monitoramento de consumo e controle remoto de tomadas com **ESP32 + PZEM-004T + relé**.

```
apps/api     API NestJS + Drizzle + PostgreSQL + Socket.IO + broker MQTT embutido (aedes)
apps/web     Web app (PWA) Next.js 15 + Tailwind 4 + Recharts — build estático servido pela API
firmware/    Firmware do ESP32 (PlatformIO)
docs/        PLANO.md (arquitetura e fases) · MQTT.md (contrato de tópicos)
```

## Rodando local

Pré-requisitos: Node 22+, pnpm (`npm i -g pnpm`) e um Postgres
(`pnpm db:up` com Docker, ou Postgres.app).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env          # ajuste DATABASE_URL se precisar
cp apps/web/.env.example apps/web/.env.local
pnpm dev        # API em :3001 (com broker MQTT :1883 e 3 dispositivos simulados) + Web em :3000
```

Abra http://localhost:3000 — senha `troque-esta-senha` (`APP_PASSWORD` no `.env` da API).
As tabelas são criadas sozinhas no start da API e, com `DEMO_SEED=true`, o banco vazio já
ganha 7 dias de histórico.

## Com o ESP32 de verdade

1. Siga `firmware/README.md` (ligações + gravação).
2. Local: em `secrets.h`, `MQTT_HOST` = IP do Mac na rede, porta 1883.
   Nuvem: host/porta do TCP Proxy do Railway + `MQTT_USERNAME`/`MQTT_PASSWORD` da API.
3. O dispositivo aparece sozinho no dashboard como `esp32-xxxxxx`. Renomeie em Configurações.
4. Quando não precisar mais dos aparelhos falsos: `DEMO_SIMULATOR=false` e remova-os pelo app.

## Deploy (Railway)

Um serviço só (Dockerfile na raiz) + Postgres:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `APP_PASSWORD` | senha de login do app |
| `JWT_SECRET` | texto aleatório grande |
| `MQTT_EMBEDDED_BROKER` | `true` |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | credenciais que o ESP32 vai usar |
| `DEMO_SEED` / `DEMO_SIMULATOR` | `true` para demonstração sem hardware |
| `TZ` | `America/Sao_Paulo` |

- Domínio público → porta HTTP (variável `PORT` do Railway).
- **TCP Proxy → porta 1883** (é por onde o ESP32 conecta).
- Healthcheck: `/api/health` (já no `railway.json`).
- Todo `git push` na `main` faz deploy de novo.

## O que já funciona

- Dashboard com potência total ao vivo, consumo e custo (R$) de hoje e do mês
- Card por tomada: W, V, A, kWh do dia, botão liga/desliga (só muda quando o ESP32 confirma)
- Página do dispositivo: 6 grandezas do PZEM, gráfico de potência (1 h ao vivo / 6 h / 24 h / 7 d),
  consumo por hora/dia, linha do tempo de eventos
- Agendamentos (ligar/desligar em horário e dias da semana)
- Regra de proteção: desliga sozinho acima de X W
- Ranking de quem mais consome
- Detecção de offline (Last Will do MQTT + timeout de 30 s)
- Login por senha única (JWT) na API e no WebSocket; broker MQTT com usuário/senha
- Histórico compactado (1 leitura/min depois de 2 dias) e apagado após 40 dias
- PWA: no celular, "Adicionar à tela inicial"

## API (prefixo `/api`, tudo exige `Authorization: Bearer <token>` exceto login/health)

| Método | Rota | |
|---|---|---|
| POST | `/auth/login` | `{ password }` → `{ token }` |
| GET | `/health` | status da API e do MQTT |
| GET | `/devices` | lista + kWh/R$ de hoje e do mês |
| GET/PATCH/DELETE | `/devices/:id` | detalhe / editar (`name, location, icon, maxPowerW`) / remover |
| POST | `/devices/:id/relay` | `{ state: "ON" \| "OFF" \| "TOGGLE" }` |
| POST | `/devices/:id/energy/reset` | zera o contador do PZEM |
| GET | `/devices/:id/power?range=1h\|6h\|24h\|7d` | série de potência |
| GET | `/devices/:id/consumption?period=day\|week\|month` | kWh por hora/dia |
| GET | `/devices/:id/events?limit=50` | linha do tempo |
| GET/POST | `/devices/:id/schedules` | agendamentos |
| PATCH/DELETE | `/schedules/:id` | editar / remover agendamento |
| GET | `/stats/overview` · `/stats/consumption` | visão da casa toda |

WebSocket (Socket.IO, `auth: { token }`): `device:update`, `reading`, `event`.
