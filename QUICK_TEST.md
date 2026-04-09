# Guardian AI - Quick Testing Commands

## 🚀 Quick Setup & Test (Copy-Paste Ready)

### 1️⃣ MQTT Broker
```bash
# Start Mosquitto
mosquitto -v

# In another terminal - Subscribe to all messages
mosquitto_sub -h localhost -t "#" -v
```

### 2️⃣ Backend Server
```bash
cd backend

# Install dependencies
npm install

# Import database schema
mysql -u root -p < database/smart_voice_alert.sql

# Edit .env file if needed
# nano .env

# Start server
npm run dev

# Health check (in another terminal)
curl http://localhost:3001/health
```

### 3️⃣ Create Test User
```bash
# Define variables
EMAIL="test@example.com"
PASSWORD="TestPass123"
TOKEN=""

# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"first_name\": \"Test\",
    \"last_name\": \"User\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"role\": \"caregiver\"
  }"

# Login and save token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | jq -r '.token')

echo "Token: $TOKEN"
```

### 4️⃣ Create Device
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:3001/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"device_name\": \"Test Device\",
    \"device_code\": \"ESP32_DEVICE_001\",
    \"patient_id\": null
  }"

# Verify device created
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/devices | jq
```

### 5️⃣ ESP32 Setup & Flash
```bash
cd esp32

# Edit WiFi credentials in main/voice_recorder.c
# Line 39-40: WIFI_SSID, WIFI_PASSWORD
# Line 45-46: MQTT_BROKER_URI, MQTT_DEVICE_CODE

# Build
idf.py build

# Flash to device
idf.py -p /dev/ttyUSB0 flash monitor
# Windows: idf.py -p COM3 flash monitor

# Expected: "WiFi connected" then "MQTT connected"
```

### 6️⃣ Monitor Audio Reception
```bash
# Terminal 1: Watch MQTT audio topic
mosquitto_sub -h localhost -t "voice/audio/#" -v

# Terminal 2: Check backend logs for:
# [MQTT] Audio file saved
# [Queue] Processing
# [AI] Detection result
```

### 7️⃣ Get Events
```bash
TOKEN="your_token"

# Get recent events
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/events?limit=10" | jq

# Get statistics
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/events/summary/stats" | jq
```

### 8️⃣ Check Database
```bash
mysql -u root -p smart_voice_alert

# Users
SELECT id, email, role FROM users;

# Devices
SELECT device_id, device_code, device_status FROM device;

# Events
SELECT event_id, keyword_detected, is_alert, alert_level FROM event_sound;

# Alerts
SELECT * FROM alert_log ORDER BY sent_at DESC;
```

### 9️⃣ Test AI Detection
```bash
# Direct test
python backend/ai/detect.py backend/tmp/sample.wav

# Expected output:
# {"is_alert": 1, "keyword": "help", "level": "4", "confidence": 0.95}
```

### 🔟 Test Alerts
```bash
TOKEN="your_token"

# Get active alerts
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/alerts?status=sent" | jq

# Acknowledge alert
curl -X PUT http://localhost:3001/alerts/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "acknowledged"}'

# Get alert summary
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/alerts/summary/dashboard" | jq
```

---

## ✅ Testing Status Matrix

```
MQTT Broker          ☐ Running on :1883
Backend Server       ☐ Running on :3001
User Authentication  ☐ Register & Login working
Device Created       ☐ ESP32_DEVICE_001 in database
ESP32 WiFi           ☐ Connected to router (2.4GHz)
ESP32 MQTT           ☐ Device status = "online"
Audio Streaming      ☐ WAV files in backend/tmp/
AI Detection         ☐ Keywords detected & logged
Database Storage     ☐ Events in event_sound table
LINE Notifications   ☐ Alerts received on LINE
Socket.io Events     ☐ Real-time updates in frontend
Dashboard Display    ☐ Frontend showing alerts
```

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3001 already in use | Kill process: `lsof -i :3001` then `kill -9 <PID>` |
| MQTT connection refused | Start Mosquitto: `mosquitto -v` |
| Database connection error | Check: `mysql -u root -p` |
| ESP32 won't connect to WiFi | Verify SSID/password, check 2.4GHz band |
| No audio files created | Check permissions: `ls -la backend/tmp/` |
| AI script errors | Install: `pip install librosa numpy scipy` |
| JWT token expired | Re-login to get new token |
| Device still shows "offline" | Restart ESP32 or check MQTT connection |

---

## 📊 Data Structures

### Event JSON
```json
{
  "event_id": 1,
  "device_id": 1,
  "device_code": "ESP32_DEVICE_001",
  "transcribed_text": "help me please",
  "keyword_detected": "help",
  "is_alert": 1,
  "alert_level": "4",
  "confidence": 0.95,
  "created_at": "2024-01-15T10:30:50Z"
}
```

### Alert JSON
```json
{
  "alert_id": 1,
  "event_id": 1,
  "alert_level": 4,
  "message": "Alert: help",
  "status": "sent",
  "sent_at": "2024-01-15T10:30:51Z",
  "acknowledged_at": null
}
```

### Device JSON
```json
{
  "device_id": 1,
  "device_name": "Patient Room 101",
  "device_code": "ESP32_DEVICE_001",
  "device_status": "online",
  "patient_id": null,
  "created_at": "2024-01-15T09:00:00Z"
}
```

---

## 🎯 Success Indicators

✅ **Checkbox Items to Complete:**

1. [ ] Mosquitto starts and listens on port 1883
2. [ ] `cursor http://localhost:3001/health` returns 200 OK
3. [ ] User registration returns 201 Created
4. [ ] JWT token received and can be decoded
5. [ ] Device created with device_code matching ESP32
6. [ ] ESP32 shows "WiFi connected" in serial logs
7. [ ] ESP32 shows "MQTT connected" in serial logs
8. [ ] WAV audio files appear in `backend/tmp/`
9. [ ] `python ai/detect.py` returns JSON with is_alert
10. [ ] Events appear in database: `SELECT * FROM event_sound;`
11. [ ] LINE notification received (if token configured)
12. [ ] Frontend dashboard updates in real-time

---

## 🔍 Debugging Tools

```bash
# View MySQL logs
tail -f /var/log/mysql/error.log

# View backend console output
# Already shown when running: npm run dev

# View ESP32 serial logs
idf.py monitor

# Monitor network traffic
tcpdump -i lo port 1883 -A

# Check process status
ps aux | grep mqtt
ps aux | grep node
ps aux | grep mysql

# Kill processes
pkill -f mosquitto
pkill -f "node server.js"
```

---

## 📱 LINE Notify Setup

1. Go to: https://notify-bot.line.me/
2. Click "Log in" → "Connect with LINE"
3. Allow permissions
4. Copy token from "マイページ" (My Page)
5. Edit `.env`: `LINE_NOTIFY_TOKEN=your_token`
6. Restart backend
7. Trigger alert to test

---

## 📞 Support References

- Backend Docs: [backend/README.md](./backend/README.md)
- ESP32 Guide: [esp32/README.md](./esp32/README.md)
- Full Setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- Testing: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

---

**Version:** 1.0.0 | **Last Updated:** April 2024
