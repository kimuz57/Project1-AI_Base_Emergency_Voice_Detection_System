# Guardian AI - Testing Flow Diagram

## Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                  GUARDIAN AI TESTING FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: INFRASTRUCTURE SETUP
════════════════════════════════════════════════════════════════════════

Step 1: Start MQTT Broker
┌──────────────────────┐
│  MQTT (Mosquitto)    │
│  mosquitto -v        │
│  Listening: 1883     │
└──────────────────────┘
         ↓
    ✓ Port 1883 active
    ✓ Topic subscriptions working


Step 2: Start Backend Server
┌──────────────────────┐
│  Node.js Backend     │
│  npm run dev         │
│  Listening: 3001     │
└──────────────────────┘
         ↓
    ✓ Database connected
    ✓ MQTT client connected
    ✓ Socket.io ready


Step 3: Database Ready
┌──────────────────────┐
│  MySQL Database      │
│  smart_voice_alert   │
│  Tables initialized  │
└──────────────────────┘
         ↓
    ✓ Schema imported
    ✓ Tables created


════════════════════════════════════════════════════════════════════════
PHASE 2: USER & DEVICE SETUP
════════════════════════════════════════════════════════════════════════

Step 4: Register User
┌─────────────────────────────────┐
│  POST /auth/register             │
│  ├─ first_name: John            │
│  ├─ last_name: Doe              │
│  ├─ email: john@example.com     │
│  ├─ password: SecurePass123      │
│  └─ role: caregiver             │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  Database "users" table         │
│  ├─ id: 1                       │
│  ├─ email: john@example.com     │
│  ├─ password: (hashed)          │
│  └─ role: caregiver             │
└─────────────────────────────────┘


Step 5: User Login
┌─────────────────────────────────┐
│  POST /auth/login                │
│  ├─ email: john@example.com     │
│  └─ password: SecurePass123     │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  JWT Token Generated             │
│  Token: eyJhbGci...             │
│  Expires: 8 hours               │
└─────────────────────────────────┘
         ↙
    Save Token for API Calls
    Authorization: Bearer <token>


Step 6: Create Device Entry
┌──────────────────────────────────────┐
│  POST /devices (with Bearer token)   │
│  ├─ device_name: Room 101            │
│  ├─ device_code: ESP32_DEVICE_001    │
│  └─ patient_id: null                 │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Database "device" table             │
│  ├─ device_id: 1                     │
│  ├─ device_code: ESP32_DEVICE_001    │
│  ├─ device_status: offline           │
│  └─ created_at: 2024-01-15...        │
└──────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
PHASE 3: ESP32 HARDWARE SETUP
════════════════════════════════════════════════════════════════════════

Step 7: Flash ESP32 Firmware
┌─────────────────────────────────┐
│  Edit voice_recorder.c          │
│  ├─ WiFi SSID: YOUR_SSID        │
│  ├─ WiFi Password: PASSWORD     │
│  ├─ MQTT Broker: localhost      │
│  └─ Device Code: ESP32_001      │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Build & Flash                   │
│  idf.py -p /dev/ttyUSB0 flash   │
│  monitor                         │
└─────────────────────────────────┘
    ↓
┌──────────────────────────┐
│  ESP32 Device            │
│  ├─ Booting...           │
│  ├─ I2S initialized      │
│  ├─ WiFi connecting...   │
│  └─ (Blue LED blink)     │
└──────────────────────────┘


Step 8: WiFi Connection
┌──────────────────────────────────────┐
│  ESP32 Serial Output:                │
│  "WiFi connecting..."                │
│  (waiting for router...)              │
└──────────────────────────────────────┘
         ↓
     (3-5 seconds)
         ↓
┌──────────────────────────────────────┐
│  "✓ WiFi connected"                  │
│  "IP: 192.168.1.102"                 │
│  (Blue LED blinks 3 times)           │
└──────────────────────────────────────┘


Step 9: MQTT Connection
┌──────────────────────────────────────┐
│  ESP32 connects to MQTT broker       │
│  Topic: device/status/ESP32_001      │
│  Message: "online"                   │
└──────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  Backend receives status            │
│  Updates device in database:         │
│  device_status: "offline" → "online" │
└────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
PHASE 4: AUDIO PROCESSING LOOP
════════════════════════════════════════════════════════════════════════

Step 10: Audio Recording & Transmission

┌─────────────────────────────────────────────────────────┐
│  ESP32 Audio Recording (5-second cycle)                 │
│                                                          │
│  [Recording]──→ I2S Digital Audio ──→ MQTT Publisher   │
│   ↓                                                      │
│  ┌──────────────────────────┐                           │
│  │ INMP441 Microphone       │                           │
│  │ ├─ Sample Rate: 16kHz    │                           │
│  │ ├─ Bit Depth: 16-bit     │                           │
│  │ ├─ Channels: 1 (Mono)    │                           │
│  │ └─ Duration: 5 seconds   │                           │
│  └──────────────────────────┘                           │
│   ↓                                                      │
│  Data Size: ~160KB per clip                             │
│   ↓                                                      │
│  MQTT Topic: voice/audio/ESP32_DEVICE_001               │
│  (Red LED lights during recording)                      │
└─────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Mosquitto MQTT Broker               │
│  Receives binary audio data          │
│  Size: 160KB                         │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Backend MQTT Client                 │
│  Subscribes to: voice/audio/#        │
│  Receives message                    │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Save Audio to File                  │
│  Location: backend/tmp/              │
│  Filename: 1705324248123_ESP001.wav  │
│  Format: WAV (16kHz, 16-bit, Mono)   │
└──────────────────────────────────────┘


Step 11: Audio Queue Processing

┌─────────────────────────────────────┐
│  Audio Queue Manager                │
│  ├─ Queue Length: 1                 │
│  ├─ Is Processing: true             │
│  └─ Next Item: 1705324248123...wav  │
└─────────────────────────────────────┘
         ↓
        [LOCK]
         ↓
┌──────────────────────────────────────┐
│  Spawn Python Process                │
│  Command: python ai/detect.py        │
│  Argument: filepath                  │
│  Timeout: 30 seconds                 │
└──────────────────────────────────────┘
         ↓
     [PROCESSING]
         ↓
┌──────────────────────────────────────┐
│  Python AI Module (detect.py)        │
│  ├─ Load audio file                  │
│  ├─ Speech-to-Text conversion        │
│  ├─ Keyword detection                │
│  └─ Confidence scoring               │
│                                      │
│  Process:                            │
│  1. librosa.load(audio_path)         │
│  2. Transcribe → "help me please"    │
│  3. Check keywords dictionary        │
│  4. Match: "help" in level 4         │
│  5. Calculate confidence: 0.95       │
│  6. Output JSON result               │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  Results JSON                        │
│  {                                   │
│    "is_alert": 1,                    │
│    "keyword": "help",                │
│    "level": "4",                     │
│    "confidence": 0.95,               │
│    "transcribed_text": "help me..."  │
│  }                                   │
└──────────────────────────────────────┘


Step 12: Event Storage

┌──────────────────────────────────────┐
│  Backend processes AI result         │
│  1. Parse JSON response              │
│  2. Lookup device_id in database     │
│  3. Create event record              │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  INSERT INTO event_sound:            │
│  ├─ device_id: 1                     │
│  ├─ transcribed_text: "help me..."   │
│  ├─ keyword_detected: "help"         │
│  ├─ is_alert: 1                      │
│  ├─ alert_level: "4"                 │
│  ├─ confidence: 0.95                 │
│  └─ created_at: NOW()                │
│                                      │
│  Result: event_id = 1                │
└──────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
PHASE 5: NOTIFICATION FLOW
════════════════════════════════════════════════════════════════════════

Step 13: Alert Detection

┌──────────────────────────────────────┐
│  IF is_alert = 1                    │
│  ├─ Level 4 (Critical): 🔴          │
│  ├─ Level 3 (High): 🟠              │
│  ├─ Level 2 (Medium): 🟡            │
│  └─ Level 1 (Low): 🟢               │
│                                      │
│  AND confidence >= threshold         │
│  THEN: Trigger notifications         │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  INSERT INTO alert_log               │
│  ├─ event_id: 1                      │
│  ├─ alert_level: 4                   │
│  ├─ status: "sent"                   │
│  └─ sent_at: NOW()                   │
└──────────────────────────────────────┘


Step 14: LINE Notify Integration

┌──────────────────────────────────────┐
│  Check LINE_NOTIFY_TOKEN configured  │
│  if yes:                             │
│  ├─ Format alert message             │
│  ├─ Include keyword, level,          │
│  │  device, confidence, time         │
│  └─ Send to LINE API                 │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  LINE Notify API                     │
│  https://notify-api.line.me/api/...  │
│  POST with Bearer token              │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│  User's LINE Account                 │
│  Receives notification:              │
│  🔴 ALERT - Critical Priority        │
│  Keyword: help                       │
│  Confidence: 95%                     │
│  Time: 10:30:50                      │
└──────────────────────────────────────┘


Step 15: Real-time Socket.io Events

┌───────────────────────────────────────┐
│  Backend emits events to all clients  │
│                                       │
│  io.emit('alert', {                  │
│    eventId: 1,                        │
│    deviceCode: "ESP32_001",           │
│    keyword: "help",                   │
│    level: "4",                        │
│    timestamp: "2024-01-15T10:30..."   │
│  })                                   │
└───────────────────────────────────────┘
         ↓
┌───────────────────────────────────────┐
│  Frontend (Next.js Dashboard)         │
│  ├─ Socket.io client receives event  │
│  ├─ Display notification toast        │
│  ├─ Update alert list                │
│  ├─ Play sound (optional)            │
│  └─ Refresh statistics               │
└───────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
PHASE 6: VERIFICATION & MONITORING
════════════════════════════════════════════════════════════════════════

Step 16: Verify in Database

┌────────────────────────────────────────────┐
│  SELECT * FROM event_sound;                │
│  ├─ event_id: 1                            │
│  ├─ keyword_detected: help                 │
│  ├─ is_alert: 1                            │
│  ├─ alert_level: 4                         │
│  └─ created_at: 2024-01-15 10:30:50        │
│                                            │
│  SELECT * FROM alert_log;                  │
│  ├─ alert_id: 1                            │
│  ├─ event_id: 1                            │
│  ├─ status: sent                           │
│  └─ sent_at: 2024-01-15 10:30:51           │
└────────────────────────────────────────────┘


Step 17: Check API Endpoints

┌────────────────────────────────────────────┐
│  GET /events                               │
│  Returns: List of all events               │
│           with full details                │
│                                            │
│  GET /events/summary/stats                 │
│  Returns: Statistics dashboard data        │
│           total_events, alert_count, etc.  │
│                                            │
│  GET /alerts                               │
│  Returns: List of alerts sent              │
│                                            │
│  PUT /alerts/1                             │
│  Action: Acknowledge alert                 │
│          (mark as read)                    │
└────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
LOOP BACK TO STEP 10
════════════════════════════════════════════════════════════════════════

┌────────────────────────────────────────────┐
│  ESP32 continues recording in 5s cycles:   │
│                                            │
│  Timeline:                                 │
│  T+0s    → Start recording                 │
│  T+5s    → Send audio via MQTT             │
│  T+6s    → Backend receives               │
│  T+7s    → Python AI processing starts     │
│  T+10s   → Results received                │
│  T+10.5s → Event saved to DB              │
│  T+10.6s → Alert sent (if alert=1)        │
│  T+10.7s → Socket.io event sent           │
│  T+11s   → Start next recording            │
│                                            │
│  Continuous loop...                        │
└────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
DASHBOARD VIEW (Next.js Frontend)
════════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────┐
│  Guardian AI Dashboard                                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  🚨 ACTIVE ALERTS                                    │
│  ├─ Critical: 1 (🔴)                                 │
│  ├─ High: 0 (🟠)                                     │
│  └─ Medium: 0 (🟡)                                   │
│                                                       │
│  📊 STATISTICS (Last 24h)                            │
│  ├─ Total Events: 12                                │
│  ├─ Alert Events: 3                                 │
│  ├─ Active Devices: 2                               │
│  └─ Avg Confidence: 0.87                            │
│                                                       │
│  📱 DEVICES STATUS                                   │
│  ├─ ESP32_DEVICE_001: 🟢 Online (Last: 2m ago)    │
│  └─ ESP32_DEVICE_002: 🟡 Offline (Last: 1h ago)   │
│                                                       │
│  📋 RECENT EVENTS                                    │
│  ├─ [10:30:50] Room 101 - "help" - L4 - 95%        │
│  ├─ [10:25:22] Room 102 - "pain" - L2 - 78%        │
│  └─ [10:20:15] Room 101 - "call" - L1 - 65%        │
│                                                       │
│  🔔 NOTIFICATIONS (Real-time Socket.io)             │
│  Recent: 🔴 CRITICAL: "help" detected in Room 101   │
│                                                       │
└───────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
```

## Testing Decision Tree

```
START
  ↓
[✓] MQTT running?
  ├─ NO → Start Mosquitto: mosquitto -v
  └─ YES ↓
  
[✓] Backend running?
  ├─ NO → npm run dev
  └─ YES ↓
  
[✓] Database schema loaded?
  ├─ NO → mysql < database/smart_voice_alert.sql
  └─ YES ↓
  
[✓] User registered?
  ├─ NO → POST /auth/register with user data
  └─ YES ↓
  
[✓] JWT token obtained?
  ├─ NO → POST /auth/login
  └─ YES ↓
  
[✓] Device created?
  ├─ NO → POST /devices with device_code
  └─ YES ↓
  
[✓] ESP32 flashed?
  ├─ NO → idf.py flash monitor
  └─ YES ↓
  
[✓] ESP32 shows online?
  ├─ NO → Check WiFi/MQTT logs
  └─ YES ↓
  
[✓] Audio files appear in tmp/?
  ├─ NO → Check MQTT topic subscription
  └─ YES ↓
  
[✓] Event in database?
  ├─ NO → Check Python AI execution
  └─ YES ↓
  
[✓] LINE alert sent?
  ├─ NO → Configure LINE_NOTIFY_TOKEN
  └─ YES ↓
  
[✓] Frontend receives event?
  ├─ NO → Check Socket.io connection
  └─ YES ↓
  
✅ ALL TESTS PASSED!
Successfully deployment ready
```

## Timing Analysis

```
Audio Processing Timeline (Typical):
═════════════════════════════════════════════════

Event                    Duration    Cumulative
─────────────────────────────────────────────────
ESP32 Recording Start    0 sec       0 sec
Recording In Progress    5 sec       5 sec
MQTT Publish             0.1 sec     5.1 sec
Backend Receive          0.05 sec    5.15 sec
Queue Add                0.01 sec    5.16 sec
AI Processing Start      0.1 sec     5.26 sec
Python Execution         2-3 sec     7.26-8.26 sec
Result Parse             0.05 sec    8.31 sec
DB Insert                0.1 sec     8.41 sec
LINE Notify              1-2 sec     9.41-10.41 sec
Socket.io Emit           0.01 sec    10.42 sec
Frontend Receive         0.02 sec    10.44 sec
Dashboard Update         0.1 sec     10.54 sec

TOTAL LATENCY: ~10.5 seconds
(From audio start to dashboard update)
```

---

**Flow Diagram Version:** 1.0  
**Last Updated:** April 2024
