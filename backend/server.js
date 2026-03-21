// ============================================
// Guardian AI — Main Server
// ============================================
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

// ──────────────────────────────────
// Express App
// ──────────────────────────────────
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// ──────────────────────────────────
// Middleware
// ──────────────────────────────────
app.use(
  cors({
    origin: [CORS_ORIGIN, "http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static audio files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ──────────────────────────────────
// Socket.io
// ──────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [CORS_ORIGIN, "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set("io", io);

// ──────────────────────────────────
// Routes
// ──────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "✅ Guardian AI Backend is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Serve the test monitor page at the root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Auth
app.use("/auth", require("./routes/auth"));

// API Routes (protected)
app.use("/events", require("./routes/events"));
app.use("/alerts", require("./routes/alerts"));
app.use("/devices", require("./routes/devices"));
app.use("/patients", require("./routes/patients"));

// Queue status (admin)
app.get("/queue-status", (req, res) => {
  const audioQueue = require("./services/audioQueue");
  res.json(audioQueue.getStatus());
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ──────────────────────────────────
// Start MQTT Client
// ──────────────────────────────────
try {
  const { initMQTT } = require("./services/mqttClient");
  initMQTT(io);
} catch (err) {
  console.error("⚠️  MQTT initialization failed:", err.message);
  console.error("   Server will continue without MQTT");
}

// ──────────────────────────────────
// Start Server
// ──────────────────────────────────
server.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     🛡️  Guardian AI Backend Server       ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  🌐 HTTP:   http://localhost:${PORT}        ║`);
  console.log(`║  🔌 WS:     http://localhost:${PORT}        ║`);
  console.log(`║  📁 Static: /uploads/audio/              ║`);
  console.log("╚══════════════════════════════════════════╝");
});

module.exports = { app, server, io };
