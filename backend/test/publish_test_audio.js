const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_CLIENT_ID = `test_publisher_${Date.now()}`;
const DEVICE_CODE = process.argv[2] || 'testdevice';
const TOPIC = `voice/audio/${DEVICE_CODE}`;
const SAMPLE_PATH = path.join(__dirname, 'sample.wav');

const sampleWav = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
  0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00,
  0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
  0x00, 0x08, 0x00, 0x00
]);

fs.writeFileSync(SAMPLE_PATH, sampleWav);
console.log(`Sample WAV written to ${SAMPLE_PATH}`);

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: MQTT_CLIENT_ID,
  reconnectPeriod: 1000,
  connectTimeout: 30000
});

client.on('connect', () => {
  console.log(`Connected to MQTT broker at ${MQTT_HOST}:${MQTT_PORT}`);
  const payload = fs.readFileSync(SAMPLE_PATH);
  client.publish(TOPIC, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error('Publish error:', err);
    } else {
      console.log(`Published sample audio to topic: ${TOPIC}`);
    }
    client.end();
  });
});

client.on('error', (err) => {
  console.error('MQTT error:', err);
  client.end();
});
