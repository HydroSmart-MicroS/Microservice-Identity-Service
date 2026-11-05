FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci
COPY tsconfig.json ./
COPY src src
RUN npm run build
RUN node --test dist/iam/interfaces/rest/AuthInputValidation.test.js dist/iam/application/internal/queryservices/UserDirectoryQueryServiceImpl.test.js dist/iam/domain/model/valueobjects/ProfileType.test.js dist/iam/application/internal/commandservices/AccountDeletionService.test.js dist/shared/infrastructure/health/ServiceHealth.test.js dist/shared/infrastructure/messaging/RequestTrace.test.js
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/dist dist
COPY --from=build --chown=node:node /app/src/iam/infrastructure/persistence/postgresql/migrations/broker.sql dist/iam/infrastructure/persistence/postgresql/migrations/broker.sql
COPY --from=build --chown=node:node /app/package*.json ./
USER node
EXPOSE 8080
CMD ["sh", "-c", "node dist/migrate.js && node dist/server.js"]
