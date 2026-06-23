# Build the React / Vite frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Install deps first (better layer caching)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
# VITE_API_URL='' means the SPA uses relative URLs — backend and frontend
# share the same Render origin so no absolute URL is needed.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY frontend/ .
RUN npm run build

# Production backend (serves API + built frontend)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install backend deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ .

# Copy demo & tracker static assets (paths match index.js static mounts)
COPY demo/ /demo
COPY tracker/ /tracker

# Copy the built frontend into backend's public folder
COPY --from=frontend-builder /frontend/dist ./public

# Render injects PORT at runtime; default matches local docker-compose.
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
