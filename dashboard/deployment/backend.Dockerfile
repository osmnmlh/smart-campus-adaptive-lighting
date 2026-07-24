FROM node:22.23.1-alpine3.24 AS dependencies

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

FROM dependencies AS builder

COPY tsconfig.base.json ./
COPY backend backend
COPY packages/contracts packages/contracts
RUN npm run build --workspace=@smart-campus/backend

FROM node:22.23.1-alpine3.24 AS production-dependencies

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --omit=dev --workspace=@smart-campus/backend --workspace=@smart-campus/contracts

FROM node:22.23.1-alpine3.24 AS runner

ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /workspace/backend/package.json ./backend/package.json
COPY --from=production-dependencies --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=node:node /workspace/backend/dist ./backend/dist
COPY --from=builder --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist

USER node
WORKDIR /workspace/backend
EXPOSE 3001
CMD ["node", "dist/main.js"]
