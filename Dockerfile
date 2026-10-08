# Imagem única: API (NestJS) + web app estático (Next export) + broker MQTT embutido.
# Usada pelo Railway (detecta este Dockerfile na raiz do repositório).

FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=true
RUN corepack enable
WORKDIR /repo

# Dependências primeiro (cache de camada)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter web build && pnpm --filter api build
# Só as dependências de produção da API, sem symlinks do workspace
RUN pnpm --filter api deploy --prod --legacy /prod/api

FROM node:22-slim
ENV NODE_ENV=production TZ=America/Sao_Paulo WEB_DIST_DIR=/app/web
WORKDIR /app
COPY --from=build /prod/api/package.json ./package.json
COPY --from=build /prod/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle
COPY --from=build /repo/apps/web/out ./web
# 3001 = HTTP (Railway injeta PORT) · 1883 = MQTT (broker embutido)
EXPOSE 3001 1883
CMD ["node", "dist/main.js"]
