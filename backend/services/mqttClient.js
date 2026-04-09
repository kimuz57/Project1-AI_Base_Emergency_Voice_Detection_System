const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const audioQueue = require('./audioQueue');
require('dotenv').config();

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || `backend_server_${Date.now()}`;

let client = null;
let isConnected = false;

/**
 * Initialize MQTT Client
 * @param {object} io - Socket.io instance
 */
function init(io) {
  const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

  console.log(`[MQTT] Attempting to connect to ${brokerUrl}`);

  client = mqtt.connect(brokerUrl, {
    clientId: MQTT_CLIENT_ID,
    reconectPeriod: 1000,
    connectTimeout: 30000
  });

  client.on('connect', () => {
    console.log('✓ Connected to MQTT broker');
    isConnected = true;

    // Subscribe to voice audio events
    const topics = ['voice/audio/#', 'device/status/#'];
    client.subscribe(topics, (err) => {
      if (err) {
        console.error('✗ MQTT subscription error:', err);
      } else {
        console.log('✓ Subscribed to topics:', topics);
      }
    });
  });

  client.on('message', async (topic, message, packet) => {
    try {
      console.log(`[MQTT] Message received from topic: ${topic}, size: ${message.length} bytes`);

      // Parse device code from topic: voice/audio/<device_code>
      const topicParts = topic.split('/');
      if (topicParts.length >= 3 && topicParts[0] === 'voice' && topicParts[1] === 'audio') {
        const deviceCode = topicParts[2];

        // Create WAV file in tmp directory
        const timestamp = Date.now();
        const filename = `${timestamp}_${deviceCode}.wav`;
        const filepath = path.join(__dirname, '../tmp', filename);

        // Ensure directory exists
        if (!fs.existsSync(path.dirname(filepath))) {
          fs.mkdirSync(path.dirname(filepath), { recursive: true });
        }

        // Write binary audio data to file
        fs.writeFileSync(filepath, message);
        console.log(`[MQTT] Audio file saved: ${filename} (${message.length} bytes)`);

        // Add to processing queue
        audioQueue.push({
          deviceCode,
          filepath,
          filename,
          timestamp,
          io,
          messageSize: message.length
        });

      } else if (topicParts[0] === 'device' && topicParts[1] === 'status') {
        // Handle device status updates
        const deviceCode = topicParts[2];
        const status = message.toString();
        console.log(`[MQTT] Device ${deviceCode} status: ${status}`);

        // Emit to frontend
        io.emit('device_status_update', {
          deviceCode,
          status,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('[MQTT] Error processing message:', error);
    }
  });

  client.on('error', (error) => {
    console.error('✗ MQTT error:', error);
    isConnected = false;
  });

  client.on('offline', () => {
    console.warn('⚠ MQTT client offline');
    isConnected = false;
  });

  client.on('reconnect', () => {
    console.log('→ MQTT client reconnecting...');
  });

  client.on('close', () => {
    console.log('MQTT connection closed');
    isConnected = false;
  });
}

/**
 * Publish message to MQTT topic
 * @param {string} topic - Topic path
 * @param {string|Buffer} message - Message to publish
 */
function publish(topic, message) {
  if (!isConnected || !client) {
    console.warn('[MQTT] Client not connected, cannot publish');
    return;
  }

  client.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error('[MQTT] Publish error:', err);
    } else {
      console.log(`[MQTT] Published to ${topic}`);
    }
  });
}

/**
 * Check MQTT connection status
 */
function getStatus() {
  return {
    connected: isConnected,
    broker: `${MQTT_HOST}:${MQTT_PORT}`,
    clientId: MQTT_CLIENT_ID
  };
}

/**
 * Close MQTT connection
 */
function close() {
  if (client) {
    client.end();
    console.log('✗ MQTT client closed');
  }
}

module.exports = {
  init,
  publish,
  getStatus,
  close,
  isConnected: () => isConnected
};
