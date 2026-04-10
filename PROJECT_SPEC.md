# Guardian AI Emergency Voice Detection System
## Project Specification & API Contract

**Project Deadline:** 29 May 2026 (50 days)  
**Team:** Kittiwat (Backend/Go), You (AI/ML), Ball (Flutter Mobile + ESP32)

---

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│         ESP32 Device (INMP441 Microphone)               │
└────────────────────┬────────────────────────────────────┘
                     │ WiFi MQTT
                     ▼
        ┌──────────────────────────────┐
        │  Mosquitto MQTT Broker       │
        │  (device.local:1883)         │
        └────────────┬─────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
         ▼                          ▼
    voice/audio/#             device/status/#
         │                          │
         ▼                          ▼
    ┌─────────────────────────────┐
    │  Backend (Go + Fiber)       │
    │  http://api:8000            │
    └─────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
  AI API   Database
  :3000    (PostgreSQL)
    │
    ▼
┌──────────────┐
│  LINE Notify │
│  (Alerts)    │
└──────────────┘
```

---

## 🔄 Data Flow

### 1. Audio Capture → Backend
**MQTT Topic:** `voice/audio/{deviceId}`  
**Payload:** Binary WAV audio (16 kHz, 16-bit, mono)

### 2. Backend → AI API (Synchronous)
```json
POST /api/v1/audio/analyze
Content-Type: application/json

{
    "audioBuffer": "base64_encoded_audio",
    "deviceId": "device001",
    "sampleRate": 16000,
    "duration": 3.5
}
```

### 3. AI Response Format (Critical for all team members)
```json
{
    "success": true,
    "isAlert": 1,
    "keyword": "help",
    "level": 4,
    "confidence": 0.95,
    "transcribedText": "help me please",
    "processingTime": 234
}
```

**Response Fields:**
- `success` (bool): Processing successful
- `isAlert` (0/1): Alert detected
- `keyword` (string): Detected keyword (English/Thai)
- `level` (1-4): 1=Low, 2=Medium, 3=High, 4=Critical
- `confidence` (0-1): Confidence score
- `transcribedText` (string): Full STT output
- `processingTime` (int): Milliseconds

### 4. Backend → Database
```sql
INSERT INTO event_sound 
(device_id, transcribed_text, keyword_detected, is_alert, confidence, alert_level)
VALUES (?, ?, ?, ?, ?, ?)
```

### 5. Alert → LINE Notify
If `isAlert == 1`, send notification with keyword + level

---

## 🗄️ Database Schema (PostgreSQL)

### Users & Patients
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    role ENUM('admin', 'caregiver', 'doctor'),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patient_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    patient_code VARCHAR(50) UNIQUE,
    age INT,
    medical_conditions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Devices & Events
```sql
CREATE TABLE device (
    id BIGSERIAL PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_type VARCHAR(50),
    patient_id BIGINT REFERENCES patient_profile(id),
    wifi_ssid VARCHAR(100),
    mqtt_topic VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_sound (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT REFERENCES device(id),
    patient_id BIGINT REFERENCES patient_profile(id),
    transcribed_text TEXT,
    keyword_detected VARCHAR(100),
    is_alert BOOLEAN,
    confidence FLOAT,
    alert_level INT,
    event_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alert_log (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES event_sound(id),
    alert_level INT,
    message TEXT,
    status VARCHAR(50),
    sent_to_line_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎙️ AI Module Requirements

### Input
- **Format:** WAV audio file (16 kHz, mono, 16-bit)
- **Duration:** 2-30 seconds
- **Language:** Thai + English keywords

### Output (JSON)
```json
{
    "success": true,
    "isAlert": 1,
    "keyword": "ช่วย",
    "level": 4,
    "confidence": 0.92,
    "transcribedText": "ช่วยด้วยครับ",
    "processingTime": 450
}
```

### Keywords & Alert Levels

| Level | Name | Keywords | Confidence Min |
|-------|------|----------|-----------------|
| 4 | Critical | help, ช่วย, ฉุกเฉิน, crisis | 0.70 |
| 3 | High | hurt, pain, ไม่สบาย, ปวด | 0.60 |
| 2 | Medium | medicine, needed, ต้องการ, ยา | 0.50 |
| 1 | Low | call, ok, สวัสดี, โอเค | 0.40 |

### Model Training
- **Dataset:** LOTUSDIS + Custom emergency audio
- **Algorithm:** Consider CNN/LSTM or pre-trained models (Whisper)
- **Validation:** 80/20 split, measure precision/recall per level
- **Target:** >85% accuracy on test set

---

## 🔌 API Endpoints (Backend)

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/profile
```

### AI Analysis (Critical)
```
POST   /api/v1/audio/analyze
Returns: AI response (see above format)
```

### Device Management
```
GET    /api/v1/devices
POST   /api/v1/devices
PUT    /api/v1/devices/{id}
DELETE /api/v1/devices/{id}
```

### Events & Alerts
```
GET    /api/v1/events
GET    /api/v1/events/{id}
POST   /api/v1/alerts/{eventId}/acknowledge
```

---

## 📱 Mobile App (Flutter)

### Screens
1. **Login** - Email + Password
2. **Dashboard** - Device status + recent alerts
3. **Device Details** - Live audio stream + test recording
4. **Settings** - LINE Notify token configuration

### Real-time Features
- WebSocket connection to backend
- Push notifications for alerts
- Device status monitoring

---

## 🎛️ ESP32 Firmware Requirements

- WiFi connection to router
- MQTT publish to `voice/audio/{deviceId}` every 5 seconds (or on wake word)
- Send device status to `device/status/{deviceId}` every 30 seconds
- INMP441 microphone I2S capture

---

## 🧪 Testing & Validation

### Unit Tests (Backend)
- API authentication ✓
- Audio analysis endpoint ✓
- Database CRUD operations ✓

### Integration Tests
- End-to-end: ESP32 → MQTT → Backend → AI → Database → LINE Notify
- Test with 10+ emergency audio samples

### AI Model Validation
- Confusion matrix per alert level
- Precision/Recall per keyword
- False positive rate < 5%

---

## 📅 Timeline

| Week | Backend (Kittiwat) | AI (You) | Mobile (Ball) |
|------|---------|----------|----------|
| 1-2 | Setup + DB schema | Dataset prep + model design | UI mockup |
| 3-4 | Auth API + MQTT integration | Training v1 | Widget implementation |
| 5-6 | Audio analysis endpoint | Optimization + testing | API integration |
| 7-8 | Integration testing | Final model tuning | Final testing |

---

## 💾 Repository Structure

```
main_smartvoice/
├── backend_ai/              ← AI Module
│   ├── datasets/
│   │   ├── emergency/
│   │   ├── normal/
│   │   └── custom/
│   ├── models/
│   ├── src/
│   │   ├── train.py        ← Training script
│   │   ├── inference.py    ← Inference/API
│   │   └── utils.py
│   ├── requirements.txt
│   ├── README_AI.md
│   └── model.pkl
│
├── esp32/                   ← Hardware (Ball)
│   └── main/
│       └── voice_recorder.c
│
├── PROJECT_SPEC.md          ← This file
└── README.md
```

---

## ⚡ Quick Start Commands

### Backend (Go)
```bash
cd backend-go
go mod download
go run main.go
```

### AI Module
```bash
cd backend_ai
pip install -r requirements.txt
python src/train.py
python src/inference.py --audio sample.wav
```

### Mobile
```bash
flutter pub get
flutter run
```

---

## 📞 Communication Protocol

- **Daily Standup:** Progress on assigned sections
- **Shared Data Format:** Use JSON strictly (see AI response)
- **Integration Points:** Weekly sync on API contracts
- **Issue Tracking:** GitHub Issues for blockers

---

**Last Updated:** 10 April 2026  
**Status:** Active Development
