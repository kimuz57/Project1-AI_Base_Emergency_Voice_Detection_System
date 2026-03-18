// ============================================
// Guardian AI — MQTT Client Service
// ============================================
const mqtt = require("mqtt");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const audioQueue = require("./audioQueue");
require("dotenv").config();

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const AUDIO_DIR = path.join(__dirname, "..", "uploads", "audio");

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  console.log("📂 Created uploads/audio directory");
}

let client = null;
let io = null;

/**
 * Initialize MQTT Client
 * @param {object} socketIO - Socket.io server instance
 */
function initMQTT(socketIO) {
  io = socketIO;
  audioQueue.setIO(io);

  const options = {};
  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
    options.password = process.env.MQTT_PASSWORD;
  }

  client = mqtt.connect(MQTT_BROKER, {
    ...options,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    console.log("✅ MQTT connected to:", MQTT_BROKER);

    // Subscribe to voice topics
    client.subscribe("voice/#", (err) => {
      if (err) {
        console.error("❌ MQTT subscribe error:", err.message);
      } else {
        console.log("📡 MQTT subscribed to: voice/#");
      }
    });
  });

  client.on("message", async (topic, message) => {
    console.log(`📨 MQTT [${topic}]: ${message.length} bytes`);

    try {
      if (topic === "voice/audio" || topic.startsWith("voice/audio/")) {
        await handleAudioMessage(topic, message);
      } else if (topic === "voice/status" || topic.startsWith("voice/status/")) {
        await handleStatusMessage(topic, message);
      } else {
        // Generic voice message
        await handleGenericMessage(topic, message);
      }
    } catch (err) {
      console.error("❌ MQTT message handler error:", err.message);
    }
  });

  client.on("error", (err) => {
    console.error("❌ MQTT error:", err.message);
  });

  client.on("close", () => {
    console.log("⚠️  MQTT disconnected — will reconnect...");
  });

  return client;
}

/**
 * Handle audio message from ESP32
 * Topic: voice/audio or voice/audio/<device_code>
 */
async function handleAudioMessage(topic, message) {
  let data;
  let audioBuffer;
  let deviceCode = "unknown";
  let zone = "ไม่ทราบ";

  // Extract device code from topic: voice/audio/A01
  const topicParts = topic.split("/");
  if (topicParts.length >= 3) {
    deviceCode = topicParts[2];
  }

  try {
    // Try to parse as JSON (with base64 audio)
    data = JSON.parse(message.toString());
    deviceCode = data.device_code || data.device || deviceCode;
    zone = data.zone || zone;

    if (data.audio) {
      // base64 encoded audio
      audioBuffer = Buffer.from(data.audio, "base64");
    } else {
      console.log("⚠️  Audio message without audio data");
      return;
    }
  } catch {
    // Raw binary audio data
    audioBuffer = message;
  }

  // Save .wav file
  const timestamp = Date.now();
  const filename = `${deviceCode}_${timestamp}.wav`;
  const filepath = path.join(AUDIO_DIR, filename);
  const audioUrl = `/uploads/audio/${filename}`;

  fs.writeFileSync(filepath, audioBuffer);
  console.log(`💾 Audio saved: ${filename} (${audioBuffer.length} bytes)`);

  // Find device ID
  let deviceId = null;
  try {
    const [devices] = await db.query(
      "SELECT id FROM devices WHERE code = ?",
      [deviceCode]
    );
    if (devices.length > 0) {
      deviceId = devices[0].id;

      // Update device last_seen
      await db.query(
        "UPDATE devices SET last_seen = NOW(), status = 'online' WHERE id = ?",
        [deviceId]
      );
    }
  } catch (err) {
    console.error("Device lookup error:", err.message);
  }

  // Insert event_sound record
  try {
    const [result] = await db.query(
      `INSERT INTO event_sound (device_id, event_type, audio_url, zone, description)
       VALUES (?, 'เสียง', ?, ?, 'กำลังประมวลผล AI...')`,
      [deviceId, audioUrl, zone]
    );

    const eventId = result.insertId;
    console.log(`📝 Event #${eventId} created — queuing for AI processing`);

    // Add to processing queue
    audioQueue.enqueue(filepath, eventId);
  } catch (err) {
    console.error("Event insert error:", err.message);
  }
}

/**
 * Handle device status message
 * Topic: voice/status or voice/status/<device_code>
 */
async function handleStatusMessage(topic, message) {
  try {
    const data = JSON.parse(message.toString());
    const deviceCode = data.device_code || data.device || topic.split("/")[2];
    const status = data.status || "online";
    const temperature = data.temperature || null;
    const signal = data.signal || data.rssi || null;

    if (!deviceCode) return;

    // Update or insert device
    const [existing] = await db.query(
      "SELECT id FROM devices WHERE code = ?",
      [deviceCode]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE devices SET 
          status = ?, 
          temperature = ?,
          signal_strength = ?,
          last_seen = NOW()
        WHERE code = ?`,
        [status, temperature, signal, deviceCode]
      );
    } else {
      await db.query(
        `INSERT INTO devices (name, code, status, temperature, signal_strength, last_seen) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [`Node_ESP_${deviceCode}`, deviceCode, status, temperature, signal]
      );
    }

    // Emit to frontend via Socket.io
    if (io) {
      const [devices] = await db.query(
        "SELECT id FROM devices WHERE code = ?",
        [deviceCode]
      );
      if (devices.length > 0) {
        io.emit("status_update", {
          device_id: devices[0].id.toString(),
          status,
          device_code: deviceCode,
          temperature,
          signal,
        });
      }
    }

    console.log(`📊 Device ${deviceCode}: status=${status}`);
  } catch (err) {
    console.error("Status message error:", err.message);
  }
}

/**
 * Handle generic voice message
 */
async function handleGenericMessage(topic, message) {
  try {
    const data = JSON.parse(message.toString());
    console.log(`📋 Generic message [${topic}]:`, data);
  } catch {
    console.log(`📋 Generic message [${topic}]:`, message.toString().substring(0, 200));
  }
}

/**
 * Publish MQTT message
 */
function publish(topic, message) {
  if (client && client.connected) {
    client.publish(topic, JSON.stringify(message));
  }
}

module.exports = { initMQTT, publish };
