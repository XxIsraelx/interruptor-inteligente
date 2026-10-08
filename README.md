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

- Painel escuro com menu lateral (no celular vira gaveta), usando a tela toda
- **Consumo agora**: potência da casa ao vivo + gráfico dos últimos 15 minutos
- **Hoje** (kWh, R$, barras por hora) e **Conta de luz do mês** com previsão no ritmo dos últimos 7 dias
- Card por tomada: W, V, A, FP, mini-gráfico ao vivo, consumo do dia, % da casa e chave liga/desliga
  (o estado só muda quando o ESP32 confirma)
- **Consumo por aparelho**: barras empilhadas por hora/dia (hoje, 7 dias, mês), ranking e visão em tabela
- **Atividade da casa**: linha do tempo geral (ligou, desligou, offline, automações), ao vivo
- Página do dispositivo: grandezas do PZEM, potência (1 h ao vivo / 6 h / 24 h / 7 d), consumo,
  resumo (previsão do mês, pico do dia, tempo em uso), linha do tempo, agendamentos, dados do ESP32
  e configurações em gaveta (nome, cômodo, ícone, proteção por potência)
- Agendamentos (ligar/desligar em horário e dias da semana) e proteção: desliga sozinho acima de X W
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
| GET | `/devices/:id/summary` | hoje, mês, previsão, pico e tempo em uso |
| GET | `/stats/overview` | casa toda + previsão da conta |
| GET | `/stats/consumption?period=` | consumo por hora/dia com divisão por aparelho |
| GET | `/stats/live?minutes=15` | potência recente (janelas de 10 s) por aparelho e total |
| GET | `/events?limit=30` | atividade da casa toda |

WebSocket (Socket.IO, `auth: { token }`): `device:update`, `reading`, `event`.
