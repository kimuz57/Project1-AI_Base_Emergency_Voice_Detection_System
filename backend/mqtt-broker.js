const { Aedes } = require('aedes');
const net = require('net');
require('dotenv').config();

const MQTT_PORT = parseInt(process.env.MQTT_PORT, 10) || 1883;
const MQTT_HOST = process.env.MQTT_HOST || '0.0.0.0';

async function createBroker() {
  const broker = await Aedes.createBroker();
  const server = net.createServer(broker.handle);

  server.listen(MQTT_PORT, MQTT_HOST, () => {
    console.log(`\n=== Local MQTT Broker Started ===`);
    console.log(`Host: ${MQTT_HOST}`);
    console.log(`Port: ${MQTT_PORT}`);
    console.log('Use this broker with backend MQTT_HOST and MQTT_PORT settings.');
    console.log('================================\n');
  });

  server.on('error', (err) => {
    console.error('[MQTT Broker] Server error:', err);
  });

  broker.on('client', (client) => {
    console.log(`[MQTT Broker] Client connected: ${client ? client.id : 'unknown'}`);
  });

  broker.on('clientDisconnect', (client) => {
    console.log(`[MQTT Broker] Client disconnected: ${client ? client.id : 'unknown'}`);
  });

  broker.on('publish', async (packet, client) => {
    const clientId = client ? client.id : 'broker';
    console.log(`[MQTT Broker] Published topic=${packet.topic} from client=${clientId} size=${packet.payload.length}`);
  });
}

createBroker().catch((err) => {
  console.error('[MQTT Broker] Failed to start broker:', err);
  process.exit(1);
});
