# Guardian AI - Testing Checklist & Procedures

## 📋 Complete End-to-End Testing Guide

---

## ✅ CHECKPOINT 1: MQTT Broker Running

### Objective
Verify Mosquitto MQTT broker is installed and running properly.

### Command Line Tests

**1. Check if Mosquitto is installed**
```bash
mosquitto -v
# Expected output:
# mosquitto version X.X.X
```

**2. Start Mosquitto (if not running)**
```bash
# macOS
brew services start mosquitto

# Ubuntu/Debian
sudo systemctl start mosquitto

# Windows (if installed via Chocolatey)
net start Mosquitto

# Or run directly
mosquitto -v
```

**3. Verify MQTT is listening on port 1883**
```bash
# Check port status
lsof -i :1883           # macOS/Linux
netstat -ano | findstr :1883  # Windows (PowerShell)

# Expected: Process listening on 0.0.0.0:1883 or localhost:1883
```

**4. Test MQTT connectivity**
```bash
# Terminal 1: Subscribe to all topics
mosquitto_sub -h localhost -t "#" -v

# Terminal 2: Publish test message
mosquitto_pub -h localhost -t "test/message" -m "Hello MQTT"

# Expected in Terminal 1:
# test/message Hello MQTT
```

**5. Subscribe to audio topics (for later testing)**
```bash
mosquitto_sub -h localhost -t "voice/audio/#" -v
mosquitto_sub -h localhost -t "device/status/#" -v
```

### ✓ Success Criteria
- [ ] Mosquitto starts without errors
- [ ] Port 1883 is listening
- [ ] Test message published and received successfully
- [ ] Topic subscriptions working

### ❌ Troubleshooting
```
Error: Connection refused (port 1883)
Solution: 
  1. Ensure Mosquitto is installed
  2. Start Mosquitto service
  3. Check firewall allowing port 1883

Error: mosquitto_sub command not found
Solution:
  - Install mosquitto client tools
  - macOS: brew install mosquitto
  - Ubuntu: sudo apt install mosquitto-clients
  - Windows: choco install mosquitto
```

---

## ✅ CHECKPOINT 2: Backend Server Starts

### Objective
Verify Node.js backend server initializes and connects to all dependencies.

### Pre-flight Checks

**1. Verify Node.js installation**
```bash
node --version    # Should be v16 or later
npm --version
```

**2. Navigate to backend directory**
```bash
cd backend
ls -la            # Should see: server.js, package.json, .env, etc.
```

**3. Check .env configuration**
```bash
cat .env
# Verify these are set:
# PORT=3001
# DB_HOST=localhost
# DB_USER=root
# MQTT_HOST=localhost
```

**4. Verify MySQL is running and database exists**
```bash
mysql -u root -p
> SHOW DATABASES;
> USE smart_voice_alert;
> SHOW TABLES;
# Should see: users, patients, devices, event_sound, alert_log, etc.
```

### Start Backend Server

**Development Mode (with auto-reload)**
```bash
npm run dev

# Expected output:
# ✓ Database connected successfully
# ✓ I2S initialized
# ╔═══════════════════════════════════════════════╗
# ║  Guardian AI Backend Server                   ║
# ║  Version: 1.0.0                               ║
# ║  Status: Running                              ║
# ╠═══════════════════════════════════════════════╣
# ║  Server: http://localhost:3001
# ║  MQTT:   localhost:1883
# ║  Mode:   development
# ╚═══════════════════════════════════════════════╝
```

### Health Check

**In a new terminal, test health endpoint**
```bash
curl http://localhost:3001/health

# Expected response (JSON):
# {
#   "success": true,
#   "message": "Server is running",
#   "uptime": 12.345,
#   "services": {
#     "mqtt": {
#       "connected": true,
#       "broker": "localhost:1883"
#     },
#     "audioQueue": {
#       "queueLength": 0,
#       "isProcessing": false
#     }
#   }
# }
```

**Check server status**
```bash
curl http://localhost:3001/status

# Expected:
# {
#   "success": true,
#   "status": "online",
#   "version": "1.0.0",
#   "services": {
#     "mqtt": { "connected": true, ... }
#   }
# }
```

### ✓ Success Criteria
- [ ] npm run dev starts without errors
- [ ] Server listens on port 3001
- [ ] Database connection successful
- [ ] MQTT connection established
- [ ] /health and /status endpoints respond

### ❌ Troubleshooting
```
Error: npm ERR! code ENOENT
Solution:
  1. Run: npm install
  2. Ensure package.json exists

Error: Cannot find module
Solution:
  1. npm install
  2. npm install --save express socket.io dotenv mysql2 jsonwebtoken bcryptjs mqtt axios cors

Error: ECONNREFUSED (port 3306)
Solution:
  1. Verify MySQL is running
  2. Check DB credentials in .env
  3. mysql -u root -p (test connection)

Error: ECONNREFUSED (port 1883)
Solution:
  1. Start Mosquitto MQTT broker
  2. Verify broker address in .env: MQTT_HOST=localhost
```

---

## ✅ CHECKPOINT 3: Register User

### Objective
Create a new user account via REST API.

### Using Postman or cURL

**cURL Command**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "phone_number": "0812345678",
    "role": "caregiver"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "User registered successfully",
#   "userId": 1,
#   "role": "caregiver"
# }
```

**Postman Setup**
1. Method: POST
2. URL: `http://localhost:3001/auth/register`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
   ```json
   {
     "first_name": "John",
     "last_name": "Doe",
     "email": "john.doe@example.com",
     "password": "SecurePass123!",
     "phone_number": "0812345678",
     "role": "caregiver"
   }
   ```

### ✓ Success Criteria
- [ ] HTTP Status 201 (Created)
- [ ] Response contains `success: true`
- [ ] User ID returned
- [ ] Can verify in database: `SELECT * FROM users;`

### ❌ Troubleshooting
```
Error: "Email already registered"
Solution:
  - Use a different email address
  - Or delete test user: DELETE FROM users WHERE email='...';

Error: "Missing required fields"
Solution:
  - Ensure all fields present: first_name, last_name, email, password

Error: 500 Internal Server Error
Solution:
  - Check backend logs
  - Verify database connection
  - Check .env file configuration
```

---

## ✅ CHECKPOINT 4: Login & Get JWT Token

### Objective
Authenticate user and receive JWT token for subsequent API calls.

### Login Request

**cURL Command**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Login successful",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": 1,
#     "first_name": "John",
#     "last_name": "Doe",
#     "email": "john.doe@example.com",
#     "role": "caregiver"
#   }
# }
```

### Save Token for Later Use

**In Bash/PowerShell**
```bash
# Save token to environment variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Or save to file
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." > token.txt
TOKEN=$(cat token.txt)

# Use in subsequent requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/devices
```

### Verify Token (Decode)

**Check JWT contents (without verification)**
```bash
# Go to https://jwt.io and paste your token
# Or use jq if installed:
echo "eyJhbGciOi..." | cut -d'.' -f2 | base64 -d | jq
```

### ✓ Success Criteria
- [ ] HTTP Status 200
- [ ] Token present in response
- [ ] Token format: `header.payload.signature`
- [ ] Can decode token to see user info

### ❌ Troubleshooting
```
Error: "Invalid email or password"
Solution:
  - Verify email matches registered account
  - Check password is correct
  - Case-sensitive password

Error: "Account disabled"
Solution:
  - Update user status: UPDATE users SET status='active' WHERE id=1;

Error: Token expires
Solution:
  - Re-login to get new token
  - Increase JWT_EXPIRE in .env
```

---

## ✅ CHECKPOINT 5: Create Device Entry

### Objective
Register ESP32 device in database.

### Create Device Request

**cURL Command**
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3001/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Patient Room 101",
    "device_code": "ESP32_DEVICE_001",
    "patient_id": null
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Device created successfully",
#   "device_id": 1
# }
```

### Verify Device Created

**Get all devices**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/devices

# Expected:
# {
#   "success": true,
#   "count": 1,
#   "data": [
#     {
#       "device_id": 1,
#       "device_name": "Patient Room 101",
#       "device_code": "ESP32_DEVICE_001",
#       "device_status": "offline"
#     }
#   ]
# }
```

**Database verification**
```bash
mysql -u root -p smart_voice_alert
> SELECT * FROM device;
# Should see device with code: ESP32_DEVICE_001
```

### ✓ Success Criteria
- [ ] HTTP Status 201
- [ ] Device ID returned
- [ ] Device visible in GET /devices
- [ ] Device status: "offline" (until ESP32 connects)
- [ ] Device in database

### ❌ Troubleshooting
```
Error: "Device code already exists"
Solution:
  - Use unique device_code
  - Or delete old device first

Error: 401 Unauthorized
Solution:
  - Ensure Bearer token in Authorization header
  - Token may be expired, re-login

Error: 403 Forbidden
Solution:
  - Only admin/caregiver can create devices
  - Check user role in database
```

---

## ✅ CHECKPOINT 6: Connect ESP32 to WiFi

### Objective
Flash ESP32 firmware and verify WiFi connection.

### Prepare ESP32

**1. Edit WiFi credentials in voice_recorder.c**
```c
#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASSWORD "YOUR_PASSWORD"
```

**2. Set MQTT broker details**
```c
#define MQTT_BROKER_URI "mqtt://192.168.1.100:1883"  // Your server IP
#define MQTT_DEVICE_CODE "ESP32_DEVICE_001"           // Match backend device code
```

**3. Build ESP32 firmware**
```bash
cd esp32
idf.py build
```

### Flash to ESP32

**Linux/macOS**
```bash
idf.py -p /dev/ttyUSB0 flash monitor

# Or detect port automatically
idf.py -p /dev/ttyUSB* flash monitor
```

**Windows (PowerShell)**
```bash
idf.py -p COM3 flash monitor
# Replace COM3 with your actual port
```

### Monitor ESP32 Logs

**Expected output in monitor**
```
I (1234) [VOICE_RECORDER] =================================
I (1235) [VOICE_RECORDER]   Guardian AI Voice Recorder
I (1236) [VOICE_RECORDER]   Device Code: ESP32_DEVICE_001
I (1237) [VOICE_RECORDER] =================================
I (1238) [VOICE_RECORDER] ✓ I2S initialized (Sample Rate: 16000 Hz)
I (1239) [WiFi] WiFi connecting...
I (5000) [WiFi] ✓ WiFi connected, IP: 192.168.1.102
```

### ✓ Success Criteria
- [ ] Firmware compiles without errors
- [ ] Successfully flash to ESP32
- [ ] Serial monitor shows WiFi connecting
- [ ] WiFi connected with valid IP
- [ ] Blue LED on ESP32 blinks 3 times

### ❌ Troubleshooting
```
Error: "No device found on /dev/ttyUSB0"
Solution:
  - Check USB connection
  - List ports: ls -la /dev/tty.usbserial* (macOS)
  - Or: idf.py monitor (auto-detect)

Error: "Can't connect to ESP32"
Solution:
  - Try different USB cable
  - Install CH340 drivers (Windows)
  - Reset ESP32: press RST button

Error: "WiFi connection timeout"
Solution:
  - Verify SSID and password
  - Check router broadcast 2.4GHz (ESP32 doesn't support 5GHz)
  - Move closer to router
```

---

## ✅ CHECKPOINT 7: ESP32 Connects to MQTT

### Objective
Verify ESP32 establishes MQTT connection and publishes status.

### Monitor Serial Output

**Look for MQTT connection messages**
```
I (6000) [MQTT] MQTT initialization started
I (7000) [MQTT] ✓ MQTT connected
I (8000) [MQTT] Publishing audio to MQTT (160000 bytes)
```

### Check MQTT Connection

**In separate terminal with mosquitto_sub running**
```bash
mosquitto_sub -h localhost -t "device/status/#" -v

# Expected output:
# device/status/ESP32_DEVICE_001 online
```

### Verify Device Status Updated

**Check backend**
```bash
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/devices/1

# Should see device_status changed from "offline" to "online"
# {
#   "success": true,
#   "data": {
#     "device_id": 1,
#     "device_status": "online",  ← Changed!
#     ...
#   }
# }
```

**Database check**
```bash
mysql -u root -p smart_voice_alert
> SELECT device_id, device_code, device_status FROM device;
# Should show: ESP32_DEVICE_001 | online
```

### ✓ Success Criteria
- [ ] MQTT connection successful in logs
- [ ] Status message received: `device/status/ESP32_DEVICE_001 online`
- [ ] Backend device_status updated to "online"
- [ ] Database reflects online status

### ❌ Troubleshooting
```
Error: "MQTT disconnected" in logs
Solution:
  - Check MQTT_BROKER_URI is correct
  - Verify mosquitto is running
  - Check firewall allowing port 1883
  - Ensure MQTT_DEVICE_CODE=ESP32_DEVICE_001 in code

Error: Connection refused
Solution:
  - Test connectivity: nc -zv <IP> 1883
  - Ensure broker IP is correct in code
```

---

## ✅ CHECKPOINT 8: Receive Audio in Backend

### Objective
Verify ESP32 sends audio to MQTT and backend processes it.

### Watch MQTT Topic

**Terminal: Receive raw audio**
```bash
mosquitto_sub -h localhost -t "voice/audio/ESP32_DEVICE_001" -v

# Should see binary data arriving:
# voice/audio/ESP32_DEVICE_001 [binary data - ~160KB per 5-second clip]
```

### Check Backend Logs

**In backend terminal, look for**
```
[MQTT] Message received from topic: voice/audio/ESP32_DEVICE_001, size: 160000 bytes
[MQTT] Audio file saved: 1705324248123_ESP32_DEVICE_001.wav (160000 bytes)
[Queue] Added audio to queue. Queue length: 1
[Queue] Processing: 1705324248123_ESP32_DEVICE_001.wav
```

### Verify Audio File Created

**Check tmp directory**
```bash
ls -lh backend/tmp/

# Should see WAV files:
# 1705324248123_ESP32_DEVICE_001.wav

# Check file is WAV format
file backend/tmp/1705324248123_ESP32_DEVICE_001.wav
# Output: WAV audio data, 16 bit, mono 16000 Hz
```

### Play Audio (Optional)

```bash
# macOS/Linux
play backend/tmp/1705324248123_ESP32_DEVICE_001.wav

# Or with ffplay
ffplay backend/tmp/1705324248123_ESP32_DEVICE_001.wav
```

### ✓ Success Criteria
- [ ] Audio data received on MQTT topic
- [ ] WAV files created in backend/tmp/
- [ ] File size ~160KB (for 5-second clip)
- [ ] Backend logs show queue processing
- [ ] Audio file can be played

### ❌ Troubleshooting
```
Error: No audio received on MQTT
Solution:
  - Verify ESP32 still connected (check "online" status)
  - Check MQTT topic matches: voice/audio/<device_code>
  - Look at ESP32 "Recording audio" messages in logs

Error: Audio file not created
Solution:
  - Check file permissions on backend/tmp/
  - Ensure tmp directory exists: mkdir -p backend/tmp
```

---

## ✅ CHECKPOINT 9: AI Detection Processes Audio

### Objective
Verify Python AI model processes audio and detects keywords.

### Test detect.py Directly

**Run detection manually**
```bash
cd backend

python ai/detect.py tmp/1705324248123_ESP32_DEVICE_001.wav

# Expected output (JSON):
# {
#   "success": true,
#   "is_alert": 1,
#   "transcribed_text": "help I need assistance",
#   "keyword": "help",
#   "confidence": 0.95,
#   "level": "4",
#   "event_type": "voice_detection"
# }
```

### Check Backend Processing Logs

**In backend terminal output**
```
[AI] Starting audio processing: 1705324248123_ESP32_DEVICE_001.wav
[AI] Raw output: {"is_alert":1,"transcribed_text":"help...","keyword":"help"...}
[AI] Detection result: { is_alert: 1, ... }
[AI] Event saved: event_id=1
[AI] Alert detected! Level: 4
```

### Verify Event in Database

```bash
mysql -u root -p smart_voice_alert
> SELECT * FROM event_sound ORDER BY created_at DESC LIMIT 1;

# Should show:
# event_id | device_id | transcribed_text | keyword | is_alert | alert_level
# 1        | 1         | help I need...  | help    | 1        | 4
```

### ✓ Success Criteria
- [ ] Python execute without errors
- [ ] JSON output returned
- [ ] is_alert = 1 (or 0 for no alert)
- [ ] Keyword detected (if applicable)
- [ ] Confidence score 0-1
- [ ] Event saved in database

### ❌ Troubleshooting
```
Error: "module librosa not found"
Solution:
  - pip install librosa numpy scipy

Error: AI processing timeout
Solution:
  - Increase AI_SERVICE_TIMEOUT in .env
  - Optimize detect.py performance

Error: JSON decode error
Solution:
  - Check detect.py prints valid JSON
  - Run detect.py manually: python ai/detect.py file.wav
  - Debug output in stderr
```

---

## ✅ CHECKPOINT 10: Event Saved in Database

### Objective
Verify events are persisted in MySQL and retrievable via API.

### Query Events via API

**Get recent events**
```bash
TOKEN="your_jwt_token"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/events?limit=10&offset=0"

# Expected response:
# {
#   "success": true,
#   "count": 1,
#   "total": 1,
#   "data": [
#     {
#       "event_id": 1,
#       "device_id": 1,
#       "device_code": "ESP32_DEVICE_001",
#       "transcribed_text": "help I need assistance",
#       "keyword_detected": "help",
#       "is_alert": 1,
#       "alert_level": "4",
#       "confidence": 0.95,
#       "created_at": "2024-01-15T10:30:50.000Z"
#     }
#   ]
# }
```

### Get Statistics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/events/summary/stats?timeRange=24h"

# Expected:
# {
#   "success": true,
#   "stats": {
#     "total_events": 5,
#     "alert_count": 2,
#     "active_devices": 1,
#     "patients_with_events": 1,
#     "avg_confidence": 0.87
#   }
# }
```

### Database Query

```bash
mysql -u root -p smart_voice_alert

# All events
> SELECT * FROM event_sound;

# Alert events only
> SELECT * FROM event_sound WHERE is_alert = 1;

# By device
> SELECT * FROM event_sound WHERE device_id = 1 ORDER BY created_at DESC;

# Count by alert level
> SELECT alert_level, COUNT(*) FROM event_sound WHERE is_alert=1 GROUP BY alert_level;
```

### ✓ Success Criteria
- [ ] Events returned from /events endpoint
- [ ] All event fields populated correctly
- [ ] Statistics endpoint shows correct counts
- [ ] Events queryable from MySQL
- [ ] Created timestamps are accurate

### ❌ Troubleshooting
```
Error: 404 - Events not found
Solution:
  - Ensure audio was processed
  - Check AI detection returned valid result
  - Verify database has event records

Error: 0 total events
Solution:
  - Process more audio through MQTT
  - Wait for queue to finish processing
  - Check backend logs for errors
```

---

## ✅ CHECKPOINT 11: Alert Sent via LINE Notify

### Objective
Verify alerts are sent to LINE messenger.

### Configure LINE Notify Token

**1. Get LINE Notify Token**
   - Visit: https://notify-bot.line.me/
   - Click "Log in" and authorize
   - Copy personal token
   - Add to `.env`:
     ```
     LINE_NOTIFY_TOKEN=your_token_here
     ```

**2. Restart backend**
   ```bash
   npm run dev
   ```

### Trigger Alert

**Test by triggering audio with keyword**
   - Play audio containing emergency keyword
   - ESP32 sends to MQTT
   - Backend processes and detects keyword
   - Alert level >= 1

### Check Backend Logs

```
[LINE] Sending notification for device: ESP32_DEVICE_001
[LINE] Notification sent successfully. Status: 200
```

### Verify LINE Message Received

**Check your LINE account for message:**
```
🔴 ALERT - Critical Priority

🎙️ Keyword: help
📱 Device: ESP32_DEVICE_001
🎯 Confidence: 95.0%
👤 Patient: John Doe
⏰ Time: 2024-01-15 10:30:50
```

### Check Alert Log

```bash
mysql -u root -p smart_voice_alert
> SELECT * FROM alert_log ORDER BY sent_at DESC LIMIT 5;

# Should show:
# alert_id | event_id | alert_level | status | sent_at
# 1        | 1        | 4           | sent   | 2024-01-15 10:30:50
```

### Get Alert Summary

```bash
TOKEN="your_jwt_token"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/alerts/summary/dashboard"

# Expected:
# {
#   "success": true,
#   "summary": {
#     "active_alerts": 3,
#     "today_alerts": 5,
#     "critical_alerts": 1,
#     "failed_alerts": 0
#   }
# }
```

### ✓ Success Criteria
- [ ] LINE Notify token configured
- [ ] Alert received in LINE app
- [ ] Alert log created in database
- [ ] Status marked as "sent"
- [ ] Alert summary shows correct count

### ❌ Troubleshooting
```
Error: "LINE_NOTIFY_TOKEN not configured"
Solution:
  - Get token from https://notify-bot.line.me/
  - Add to .env: LINE_NOTIFY_TOKEN=...
  - Restart backend

Error: Alert not sending (no LINE message)
Solution:
  - Verify token is valid
  - Check LINE Notify service is online
  - Enable notifications in LINE app settings
  - Check backend logs for error messages

Error: "Request timeout"
Solution:
  - Check internet connection
  - LINE API may be temporarily down
  - Increase timeout in .env
```

---

## ✅ CHECKPOINT 12: Frontend Receives Socket.io Event

### Objective
Verify real-time notifications reach frontend dashboard.

### Test Socket.io Connection

**Using Node.js terminal**
```bash
node

# Connect to Socket.io
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('audio_processed', (data) => {
  console.log('Audio processed:', data);
});

socket.on('alert', (data) => {
  console.log('Alert received:', data);
});

socket.on('device_status_update', (data) => {
  console.log('Device status:', data);
});

// Keep connection open
setTimeout(() => {}, 60000);
```

### Monitor Socket Events

**In browser console (if frontend is running)**
```javascript
// Frontend should already have Socket.io connected
socket.on('alert', (data) => {
  console.log('🚨 Alert received:', data);
  // Show notification/toast
});

socket.on('audio_processed', (data) => {
  console.log('📊 Audio processed:', data);
});
```

### Check Events Emitted from Backend

**In backend logs**
```
[Socket.io] Client connected: sk_abc123
[AI] Event saved: event_id=1
[Socket.io] Emitting to client: alert
[Socket.io] Socket.io emit: audio_processed
```

### Expected Frontend Updates

- Real-time alert notifications appear
- Dashboard updates with latest event
- Alert badge/counter increments
- Device status changes reflected immediately

### ✓ Success Criteria
- [ ] Socket.io client connects successfully
- [ ] Events received: alert, audio_processed, device_status_update
- [ ] Data contains expected fields
- [ ] Frontend displays in real-time
- [ ] No connection errors

### ❌ Troubleshooting
```
Error: "Failed to connect to Socket.io"
Solution:
  - Verify backend running on :3001
  - Check CORS_ORIGIN in .env
  - Ensure Socket.io middleware enabled in server.js

Error: No events received
Solution:
  - Trigger alert by processing audio
  - Check browser Network tab
  - Verify socket event names: emit('alert', ...)

Error: Connection drops frequently
Solution:
  - Check network stability
  - Increase timeout settings
  - Update Socket.io version
```

---

## 🎯 Summary Checklist

| # | Component | Status | Notes |
|---|-----------|--------|-------|
| 1 | MQTT Broker | ☐ | Port 1883 listening |
| 2 | Backend Server | ☐ | Running on :3001 |
| 3 | User Register | ☐ | Account created |
| 4 | JWT Login | ☐ | Token received |
| 5 | Device Entry | ☐ | Device in DB |
| 6 | ESP32 WiFi | ☐ | Connected to AP |
| 7 | ESP32 MQTT | ☐ | Online status |
| 8 | Audio Reception | ☐ | WAV files created |
| 9 | AI Processing | ☐ | Keywords detected |
| 10 | DB Storage | ☐ | Events saved |
| 11 | LINE Alert | ☐ | Message received |
| 12 | Socket.io | ☐ | Real-time events |

---

## 🚀 Full End-to-End Test Flow

```bash
# Terminal 1: Start MQTT Broker
mosquitto -v

# Terminal 2: Start Backend
cd backend && npm run dev

# Terminal 3: Monitor MQTT
mosquitto_sub -h localhost -t "voice/audio/#" -v

# Terminal 4: Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com","password":"pass123","role":"caregiver"}'

# Terminal 5: Login and create device
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}' | jq -r .token)

curl -X POST http://localhost:3001/devices \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"device_name":"Room 101","device_code":"ESP32_DEVICE_001"}'

# Terminal 6: Flash and monitor ESP32
cd esp32 && idf.py -p /dev/ttyUSB0 flash monitor

# Terminal 7: Check events
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/events

# Terminal 8: Check alerts
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/alerts
```

---

## 📎 Quick Reference Commands

```bash
# MQTT
mosquitto_sub -h localhost -t "#" -v
mosquitto_pub -h localhost -t "test" -m "message"

# Backend Health
curl http://localhost:3001/health
curl http://localhost:3001/status

# Database
mysql -u root -p smart_voice_alert
> SHOW TABLES;
> SELECT * FROM users;
> SELECT * FROM event_sound;

# ESP32
idf.py monitor
idf.py -p /dev/ttyUSB0 flash monitor

# Logs
# Backend: npm run dev (shows in console)
# ESP32: idf.py monitor (shows serial output)
# MySQL: SELECT * FROM event_sound;
```

---

**Last Updated:** April 2024  
**Version:** 1.0.0
