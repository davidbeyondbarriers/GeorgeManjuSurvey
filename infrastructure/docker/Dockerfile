# ── Stage: dev ────────────────────────────────────────────────────────────────
# Used by docker-compose.yml for local development with hot-reload.
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npx", "nodemon", "--watch", "backend/src", "--watch", "backend/db", "--ext", "js,json", "backend/src/server.js"]

# ── Stage: build ──────────────────────────────────────────────────────────────
# Compiles the Vite frontend into dist/.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage: production ─────────────────────────────────────────────────────────
# Slim final image: prod deps only + API source + compiled frontend.
# Express serves both the API routes and the static frontend on port 3000.
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./backend/src
COPY backend/db  ./backend/db

# Copy compiled frontend from build stage
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Healthcheck — ECS uses this to decide if the task is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/src/server.js"]
