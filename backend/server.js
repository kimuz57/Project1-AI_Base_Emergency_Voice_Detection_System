/**
 * Guardian AI — Node.js Backend Server
 * ─────────────────────────────────────────────────────────────────
 * Flow:
 *   ESP32 (MQTT audio chunks)
 *     → รวม chunks เป็น Buffer 2 วินาที
 *     → เขียนเป็น .wav
 *     → เรียก Python detect.py
 *     → บันทึก SQLite
 *     → WebSocket → Dashboard
 *     → LINE Notify (ถ้า is_alert)
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mqtt          = require('mqtt');
const { WebSocketServer } = require('ws');
const http          = require('http');
const path          = require('path');
const fs            = require('fs');
const { spawn }     = require('child_process');

const { saveWavFile, audioBytesForSeconds } = require('./wav_utils');
const { sendLineAlert }                      = require('./line_notify');
const { insertEvent, getRecentEvents, getAlertEvents, getStats } = require('./db');

/* ─── CONFIG ──────────────────────────────────────────────────── */
const MQTT_BROKER  = process.env.MQTT_BROKER  || 'mqtt://localhost:1883';
const MQTT_TOPIC   = process.env.MQTT_TOPIC   || 'voice/audio/#';
const WS_PORT      = parseInt(process.env.WS_PORT)   || 8081;
const HTTP_PORT    = parseInt(process.env.HTTP_PORT)  || 3001;
const SAMPLE_RATE  = parseInt(process.env.SAMPLE_RATE) || 16000;
const BUFFER_SECS  = parseFloat(process.env.AUDIO_BUFFER_SECONDS) || 2.0;
const AUDIO_DIR    = process.env.AUDIO_DIR    || './audio_files';
const PYTHON_CMD   = process.env.PYTHON_CMD   || 'python';
const ALERT_THRESH = parseFloat(process.env.ALERT_THRESHOLD) || 0.7;

// บาง bytes ต้องรวมก่อน flush เป็น WAV
const FLUSH_BYTES = audioBytesForSeconds(BUFFER_SECS, SAMPLE_RATE);

/* ─── PREPARE AUDIO DIR ───────────────────────────────────────── */
fs.mkdirSync(AUDIO_DIR, { recursive: true });

/* ─── STATE: audio buffers per device ─────────────────────────── */
// Map: deviceCode → { chunks: Buffer[], totalBytes: number }
const deviceBuffers = new Map();

function getDeviceBuffer(deviceCode) {
    if (!deviceBuffers.has(deviceCode)) {
        deviceBuffers.set(deviceCode, { chunks: [], totalBytes: 0 });
    }
    return deviceBuffers.get(deviceCode);
}

/* ═══════════════════════════════════════════════════════════════
 *  MQTT SUBSCRIBER
 * ═══════════════════════════════════════════════════════════════ */
console.log(`\n🚀 Guardian AI Backend starting...`);
console.log(`📡 Connecting to MQTT: ${MQTT_BROKER}`);

const mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: 'guardian_backend_' + Math.random().toString(16).slice(2, 8),
    keepalive: 60,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
});

mqttClient.on('connect', () => {
    console.log(`✅ MQTT connected to ${MQTT_BROKER}`);
    mqttClient.subscribe(MQTT_TOPIC, { qos: 0 }, (err) => {
        if (err) {
            console.error('❌ Subscribe error:', err);
        } else {
            console.log(`📻 Subscribed to: ${MQTT_TOPIC}`);
        }
    });
});

mqttClient.on('error',       (err) => console.error('❌ MQTT error:', err.message));
mqttClient.on('reconnect',   ()    => console.log('🔄 MQTT reconnecting...'));
mqttClient.on('offline',     ()    => console.warn('⚠️  MQTT offline'));

/* ─── รับ Audio Chunks ────────────────────────────────────────── */
mqttClient.on('message', async (topic, payload) => {
    // topic format: voice/audio/<device_code>
    const parts      = topic.split('/');
    const deviceCode = parts[2] || 'UNKNOWN';

    const buf = deviceBuffers.get(deviceCode) || { chunks: [], totalBytes: 0 };
    buf.chunks.push(Buffer.from(payload));
    buf.totalBytes += payload.length;
    deviceBuffers.set(deviceCode, buf);

    process.stdout.write(`\r🎤 [${deviceCode}] Buffer: ${(buf.totalBytes / 1024).toFixed(1)} KB / ${(FLUSH_BYTES / 1024).toFixed(1)} KB`);

    // เมื่อสะสมครบ 2 วินาที → flush
    if (buf.totalBytes >= FLUSH_BYTES) {
        const chunksToProcess = [...buf.chunks];
        buf.chunks    = [];
        buf.totalBytes = 0;

        console.log(`\n📦 [${deviceCode}] Flushing ${BUFFER_SECS}s audio → processing...`);
        await processAudioBuffer(deviceCode, chunksToProcess);
    }
});

/* ═══════════════════════════════════════════════════════════════
 *  AUDIO PROCESSING PIPELINE
 * ═══════════════════════════════════════════════════════════════ */
async function processAudioBuffer(deviceCode, chunks) {
    const timestamp = Date.now();
    const filename  = `${deviceCode}_${timestamp}.wav`;
    const wavPath   = path.join(AUDIO_DIR, filename);

    // 1. สร้างไฟล์ .wav
    saveWavFile(chunks, wavPath, SAMPLE_RATE);
    console.log(`💾 [${deviceCode}] WAV saved: ${filename}`);

    // 2. เรียก Python AI
    let aiResult = null;
    try {
        aiResult = await runPythonDetect(wavPath);
        console.log(`🤖 [${deviceCode}] AI result:`, aiResult);
    } catch (err) {
        console.error(`❌ [${deviceCode}] Python detect error:`, err.message);
        aiResult = { keyword: 'error', confidence: 0, is_alert: false, error: err.message };
    }

    const isAlert = (aiResult.is_alert === true) && (aiResult.confidence >= ALERT_THRESH);

    // 3. บันทึก DB
    const eventId = insertEvent({
        deviceCode,
        eventSound:      aiResult.keyword,
        audioUrl:        wavPath,
        keywordDetected: aiResult.keyword,
        confidence:      aiResult.confidence,
        isAlert,
        rawResult:       aiResult,
    });

    console.log(`📝 [${deviceCode}] Event #${eventId} saved — keyword=${aiResult.keyword} conf=${(aiResult.confidence * 100).toFixed(0)}% alert=${isAlert}`);

    // 4. Broadcast ผ่าน WebSocket → Dashboard
    const wsPayload = {
        type:       'audio_event',
        eventId,
        deviceCode,
        keyword:    aiResult.keyword,
        confidence: aiResult.confidence,
        isAlert,
        audioUrl:   wavPath,
        timestamp:  new Date().toISOString(),
    };
    broadcastWs(wsPayload);

    // 5. LINE Alert ถ้า is_alert
    if (isAlert) {
        console.log(`🚨 [${deviceCode}] ALERT triggered! Sending LINE notification...`);
        await sendLineAlert({
            keyword:    aiResult.keyword,
            deviceCode,
            confidence: aiResult.confidence,
            audioUrl:   wavPath,
        });
    }
}

/* ═══════════════════════════════════════════════════════════════
 *  PYTHON DETECT.PY
 * ═══════════════════════════════════════════════════════════════ */
function runPythonDetect(wavPath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'detect.py');

        const proc = spawn(PYTHON_CMD, [scriptPath, wavPath], {
            timeout: 15000,  // 15 วินาที max
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (d) => stdout += d.toString());
        proc.stderr.on('data', (d) => stderr += d.toString());

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python exit ${code}: ${stderr.trim()}`));
                return;
            }

            try {
                // Python ส่งผล JSON มาทาง stdout
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (e) {
                reject(new Error(`Invalid JSON from Python: ${stdout}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Spawn error: ${err.message}`));
        });
    });
}

/* ═══════════════════════════════════════════════════════════════
 *  WEBSOCKET SERVER (สำหรับ Dashboard)
 * ═══════════════════════════════════════════════════════════════ */
const wss = new WebSocketServer({ port: WS_PORT });
const wsClients = new Set();

wss.on('connection', (ws, req) => {
    wsClients.add(ws);
    const clientIp = req.socket.remoteAddress;
    console.log(`🔌 Dashboard connected: ${clientIp} (total: ${wsClients.size})`);

    // ส่ง recent events ให้ client ใหม่ทันที
    const recent = getRecentEvents(20);
    ws.send(JSON.stringify({ type: 'init', events: recent, stats: getStats() }));

    ws.on('close',   () => { wsClients.delete(ws); });
    ws.on('error',   (err) => console.error('WS error:', err.message));
});

function broadcastWs(data) {
    const msg = JSON.stringify(data);
    wsClients.forEach((client) => {
        if (client.readyState === 1) {  // OPEN
            client.send(msg);
        }
    });
}

console.log(`🔌 WebSocket server: ws://localhost:${WS_PORT}`);

/* ═══════════════════════════════════════════════════════════════
 *  HTTP API (สำหรับ Dashboard / Next.js)
 * ═══════════════════════════════════════════════════════════════ */
const httpServer = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const url = req.url?.split('?')[0];

    if (url === '/api/events') {
        res.end(JSON.stringify({ success: true, data: getRecentEvents(50) }));

    } else if (url === '/api/events/alerts') {
        res.end(JSON.stringify({ success: true, data: getAlertEvents(20) }));

    } else if (url === '/api/stats') {
        res.end(JSON.stringify({ success: true, data: getStats() }));

    } else if (url === '/api/health') {
        res.end(JSON.stringify({
            success: true,
            status: 'ok',
            mqtt: mqttClient.connected,
            wsClients: wsClients.size,
            uptime: process.uptime(),
        }));

    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP API: http://localhost:${HTTP_PORT}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   GET /api/events        — recent events`);
    console.log(`   GET /api/events/alerts — alert events only`);
    console.log(`   GET /api/stats         — statistics`);
    console.log(`   GET /api/health        — system health\n`);
    console.log(`✨ Guardian AI Backend ready!\n`);
});

/* ─── Graceful Shutdown ───────────────────────────────────────── */
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    mqttClient.end();
    wss.close();
    httpServer.close();
    process.exit(0);
});
