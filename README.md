# Guardian AI — Full System Setup Guide

## 🏗️ System Architecture

```
ESP32 + INMP441 (I2S Mic)
   ↓ MQTT: voice/audio/A01 (binary PCM chunks)
Node.js Backend (server.js)
   ↓ รวม chunks → .wav (2 วินาที)
Python detect.py (AI sound detection)
   ↓ JSON result
SQLite Database (guardian.db)
   ↓ WebSocket
Next.js Dashboard (real-time)
   ↓ LINE Notify API
📱 LINE Alert
```

---

## 📁 File Structure

```
hardware_connect_wifi/
├── connect/                        ← ESP32 Firmware
│   ├── CMakeLists.txt
│   └── main/
│       ├── CMakeLists.txt
│       └── connect.c               ← WiFi + I2S + MQTT
└── backend/                        ← Node.js + Python
    ├── server.js                   ← Main server
    ├── detect.py                   ← AI sound detection
    ├── wav_utils.js                ← WAV file builder
    ├── line_notify.js              ← LINE Notify
    ├── db.js                       ← SQLite helper
    ├── package.json
    └── .env                        ← Config (แก้ที่นี่!)
```

---

## ⚡ Quick Start

### 1. ตั้งค่า ESP32 Firmware

แก้ไขใน `connect/main/connect.c`:
```c
#define WIFI_SSID        "ชื่อ WiFi ของคุณ"
#define WIFI_PASSWORD    "รหัส WiFi"
#define MQTT_BROKER_URI  "mqtt://192.168.x.x"  // IP ของเครื่อง backend
```

Build และ Flash ด้วย Docker (ESP-IDF):
```bash
# ใน Docker container ที่รันอยู่
cd /data/connect
idf.py set-target esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

### 2. ติดตั้ง MQTT Broker (mosquitto)

**Windows:**
```powershell
# ดาวน์โหลดจาก https://mosquitto.org/download/
# หรือใช้ Docker:
docker run -d -p 1883:1883 --name mosquitto eclipse-mosquitto
```

**ทดสอบ:**
```bash
mosquitto_sub -h localhost -t "voice/audio/#" -v
```

### 3. ติดตั้ง Node.js Backend

```bash
cd backend
npm install
```

แก้ `.env`:
```env
MQTT_BROKER=mqtt://localhost:1883
LINE_NOTIFY_TOKEN=your_token_here
```

รัน:
```bash
node server.js
```

### 4. ติดตั้ง Python (detect.py)

```bash
# ขั้นต่ำ (ไม่ต้องติดตั้งอะไรเพิ่ม — ใช้ stdlib)
python detect.py test.wav

# ดีขึ้น: ติดตั้ง librosa
pip install librosa soundfile numpy
```

### 5. LINE Notify Token

1. ไปที่ https://notify-bot.line.me/my/
2. คลิก "Generate token"
3. เลือก group หรือ "Kept with you"
4. Copy token → ใส่ใน `.env`

---

## 🔌 Hardware Wiring

### INMP441 → ESP32

| INMP441 Pin | ESP32 Pin | หมายเหตุ |
|------------|-----------|---------|
| VDD        | 3.3V      | ไฟเลี้ยง |
| GND        | GND       | กราวด์ |
| SD         | GPIO32    | I2S Data |
| WS         | GPIO25    | Word Select (LRCLK) |
| SCK        | GPIO26    | Bit Clock (BCLK) |
| L/R        | GND       | Mono left channel |

---

## 📡 MQTT Topic Format

| Topic | Device | ข้อมูล |
|-------|--------|--------|
| `voice/audio/A01` | ESP32 ตัวที่ 1 | Binary PCM 16-bit |
| `voice/audio/A02` | ESP32 ตัวที่ 2 | Binary PCM 16-bit |
| `voice/audio/#`   | ทุกตัว        | Wildcard |

**Audio spec:**
- Sample Rate: 16,000 Hz
- Bit Depth: 16-bit PCM
- Channels: Mono
- Chunk Size: ~4KB ทุก ~125ms
- Flush Interval: 2 วินาที → 1 ไฟล์ .wav

---

## 🤖 Sound Detection Keywords

| Keyword | ความหมาย | Alert? |
|---------|---------|--------|
| `scream` | เสียงกรีดร้อง | ✅ ใช่ |
| `breaking` | เสียงแตกหัก | ✅ ใช่ |
| `alarm` | เสียงสัญญาณเตือน | ✅ ใช่ |
| `gunshot` | เสียงปืน | ✅ ใช่ |
| `loud_noise` | เสียงดังผิดปกติ | ✅ ใช่ |
| `crying` | เสียงร้องไห้ | ❌ ไม่ |
| `normal` | เสียงปกติ | ❌ ไม่ |
| `silence` | เงียบ | ❌ ไม่ |

---

## 🌐 HTTP API (Node.js Backend)

```
Base URL: http://localhost:3001

GET /api/events          → recent 50 events
GET /api/events/alerts   → alert events only
GET /api/stats           → total counts
GET /api/health          → system status
```

## 🔌 WebSocket

```
ws://localhost:8081

รับ message types:
  init         → events history + stats (ตอน connect ใหม่)
  audio_event  → real-time event ใหม่
```

---

## 🔧 Troubleshooting

### ESP32 ไม่เชื่อม WiFi
- ตรวจ SSID / Password ใน `connect.c`
- ดู Serial Monitor: `idf.py monitor`

### MQTT ไม่ได้รับข้อมูล
```bash
# ทดสอบ broker
mosquitto_pub -h localhost -t "test" -m "hello"
mosquitto_sub -h localhost -t "test"
```

### Python error
```bash
# ทดสอบ detect.py
python detect.py path/to/audio.wav
# ควรได้ JSON output
```

### LINE ไม่แจ้งเตือน
- ตรวจ LINE_NOTIFY_TOKEN ใน `.env`
- ทดสอบ token: `curl -X POST https://notify-api.line.me/api/notify -H "Authorization: Bearer TOKEN" -d "message=test"`
