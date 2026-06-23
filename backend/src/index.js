require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const mongoose = require('mongoose');

const eventsRouter = require('./routes/events');
const sessionsRouter = require('./routes/sessions');
const heatmapRouter = require('./routes/heatmap');

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time dashboard updates
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// Attach broadcast function to app so routes can use it
app.locals.broadcast = (data) => {
  const msg = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
};

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/events', eventsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/heatmap', heatmapRouter);

// Serve demo page + tracker over HTTP so sendBeacon works
app.use('/demo', express.static(path.join(__dirname, '../../demo')));
app.use('/tracker', express.static(path.join(__dirname, '../../tracker')));

// Health check (must be before SPA catch-all)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

// Serve the built React dashboard (only present in production Docker image)
const FRONTEND_BUILD = path.join(__dirname, '../public');
app.use(express.static(FRONTEND_BUILD));

// SPA catch-all — returns index.html for any route the API doesn't own.
// In raw dev (no build), falls through to 404 JSON.
app.get('*', (_req, res) => {
  const indexPath = path.join(FRONTEND_BUILD, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

// MongoDB + server boot
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/causalfunnel';
const PORT = process.env.PORT || 10000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
