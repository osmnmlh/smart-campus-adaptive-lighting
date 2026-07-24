FROM node:22.23.1-alpine3.24 AS dependencies

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

FROM dependencies AS builder

COPY tsconfig.base.json ./
COPY frontend frontend
COPY packages/contracts packages/contracts

ARG NEXT_PUBLIC_DASHBOARD_DATA_MODE=live
ARG NEXT_PUBLIC_BACKEND_HTTP_URL=
ARG NEXT_PUBLIC_BACKEND_WS_URL=
ENV NEXT_PUBLIC_DASHBOARD_DATA_MODE=${NEXT_PUBLIC_DASHBOARD_DATA_MODE}
ENV NEXT_PUBLIC_BACKEND_HTTP_URL=${NEXT_PUBLIC_BACKEND_HTTP_URL}
ENV NEXT_PUBLIC_BACKEND_WS_URL=${NEXT_PUBLIC_BACKEND_WS_URL}

RUN npm run build --workspace=@smart-campus/frontend

FROM node:22.23.1-alpine3.24 AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=builder --chown=node:node /workspace/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /workspace/frontend/.next/static ./frontend/.next/static

USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
