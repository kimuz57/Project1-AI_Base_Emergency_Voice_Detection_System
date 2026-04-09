const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Load routes
const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const patientsRoutes = require('./routes/patients');
const eventsRoutes = require('./routes/events');
const alertsRoutes = require('./routes/alerts');

// Load services
const mqttClient = require('./services/mqttClient');
const audioQueue = require('./services/audioQueue');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// ========================================
// Middleware
// ========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========================================
// API Routes
// ========================================
app.use('/auth', authRoutes);
app.use('/devices', devicesRoutes);
app.use('/patients', patientsRoutes);
app.use('/events', eventsRoutes);
app.use('/alerts', alertsRoutes);

// ========================================
// Health Check Endpoint
// ========================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    uptime: process.uptime(),
    timestamp: new Date(),
    services: {
      mqtt: mqttClient.getStatus(),
      audioQueue: audioQueue.getStatus()
    }
  });
});

app.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      mqtt: {
        ...mqttClient.getStatus(),
        isConnected: mqttClient.isConnected()
      },
      audioQueue: audioQueue.getStatus()
    }
  });
});

// ========================================
// Socket.io Events
// ========================================
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Send initial status
  socket.emit('connection_status', {
    success: true,
    clientId: socket.id,
    timestamp: new Date()
  });

  // Handle client events
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });

  socket.on('request_status', () => {
    socket.emit('status_update', {
      mqtt: mqttClient.getStatus(),
      audioQueue: audioQueue.getStatus(),
      timestamp: new Date()
    });
  });

  socket.on('error', (error) => {
    console.error(`[Socket.io] Error from ${socket.id}:`, error);
  });
});

// ========================================
// Error Handling
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// ========================================
// Start Server
// ========================================
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  Guardian AI Backend Server                   ║
║  Version: 1.0.0                               ║
║  Status: Running                              ║
╠═══════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}
║  API:    http://localhost:${PORT}/auth
║  MQTT:   ${process.env.MQTT_HOST}:${process.env.MQTT_PORT}
║  Mode:   ${process.env.NODE_ENV || 'development'}
╚═══════════════════════════════════════════════╝
  `);
});

// ========================================
// Initialize Services
// ========================================
mqttClient.init(io);

// ========================================
// Graceful Shutdown
// ========================================
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mqttClient.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mqttClient.close();
    process.exit(0);
  });
});

module.exports = { app, server, io };
