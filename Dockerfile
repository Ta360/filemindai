# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Builds the frontend (static assets) and backend (Node/TS) into one runtime
# image. Layout mirrors what server.ts already expects locally:
#   /app/backend/dist/backend/src/server.js   (cwd = /app/backend at runtime)
#   /app/frontend/dist/...                    (served statically in production)
# ---------------------------------------------------------------------------

FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY shared ./shared
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

FROM node:22-alpine AS backend-build
WORKDIR /app
COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 4000
CMD ["node", "dist/backend/src/server.js"]
