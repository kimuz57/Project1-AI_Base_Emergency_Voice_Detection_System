# Guardian AI - Smart Emergency Voice Detection System

## 📋 Project Structure

```
main_smartvoice/
├── backend/              # Node.js Backend Server
│   ├── server.js        # Express server entry point
│   ├── package.json     # Node.js dependencies
│   ├── .env             # Configuration file
│   ├── config/          # Database configuration
│   ├── middleware/      # JWT authentication
│   ├── routes/          # API endpoints
│   ├── services/        # MQTT, Queue, AI services
│   ├── ai/              # Python AI models
│   ├── database/        # MySQL schema
│   ├── tmp/             # Temporary audio files
│   └── README.md        # Backend documentation
│
├── esp32/               # ESP32 Firmware (ESP-IDF)
│   ├── main/            # Main application code
│   ├── sdkconfig        # Board configuration
│   ├── CMakeLists.txt   # Build configuration
│   └── README.md        # Hardware setup guide
│
├── my-awesome-app/      # Next.js Frontend (อยู่เดิม)
│
├── static/              # Static HTML files (อยู่เดิม)
│
└── backend_ai/          # Python ML Training (อยู่เดิม)
```

## 🚀 Quick Start

### 1️⃣ Backend Server Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
mysql -u root -p < database/smart_voice_alert.sql

# Run development server
npm run dev

# Server runs on http://localhost:3001
```

### 2️⃣ ESP32 Device Setup

```bash
cd esp32

# Get ESP-IDF (if not installed)
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf && git checkout v4.4 && source export.sh

# Configure for your WiFi and MQTT
idf.py menuconfig
# Or edit main/voice_recorder.c

# Build and flash
idf.py -p /dev/ttyUSB0 flash monitor
# On Windows: idf.py -p COM3 flash monitor
```

### 3️⃣ MQTT Broker Setup

```bash
# Install Mosquitto
brew install mosquitto    # macOS
sudo apt install mosquitto # Ubuntu/Debian
choco install mosquitto-broker # Windows

# Start MQTT broker
mosquitto -v

# Test connection
mosquitto_sub -h localhost -t "voice/audio/#" -v
```

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Guardian AI System Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ESP32 + INMP441                                             │
│     ├─ Record audio (5 sec, 16kHz, 16-bit)                     │
│     ├─ Connect to WiFi                                         │
│     └─ Send via MQTT: voice/audio/<device_code>               │
│                                                                  │
│  2. MQTT Broker (Mosquitto)                                    │
│     └─ Receive binary audio data                               │
│                                                                  │
│  3. Backend (Node.js)                                           │
│     ├─ Subscribe to MQTT topics                                │
│     ├─ Save audio to WAV files                                 │
│     ├─ Queue audio for processing                              │
│     └─ Call Python AI detection                                │
│                                                                  │
│  4. AI Layer (Python)                                           │
│     ├─ Speech-to-Text (Whisper/STT)                            │
│     ├─ Keyword detection (emergency words)                     │
│     ├─ Confidence scoring (0-100%)                             │
│     └─ Alert level classification (1-4)                        │
│                                                                  │
│  5. Alert Processing                                            │
│     ├─ Save event to MySQL database                            │
│     ├─ Send LINE Notify to caregiver                          │
│     └─ Emit real-time Socket.io event                          │
│                                                                  │
│  6. Frontend Dashboard (Next.js)                                │
│     ├─ Real-time alert notifications                           │
│     ├─ Patient information display                             │
│     ├─ Event history and analytics                             │
│     └─ Device management interface                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hardware** | ESP32 + INMP441 | Voice capture |
| **Protocol** | MQTT | IoT communication |
| **Backend** | Node.js + Express | API server |
| **Queue** | In-memory | Audio processing queue |
| **AI** | Python + librosa | Speech recognition |
| **Database** | MySQL | Data persistence |
| **Real-time** | Socket.io | Live notifications |
| **Notifications** | LINE Notify API | Alert delivery |
| **Frontend** | Next.js 14 | Web dashboard |

## 📱 API Overview

### Authentication
```bash
# Register
POST /auth/register
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "caregiver"
}

# Login  
POST /auth/login
{
  "email": "john@example.com",
  "password": "secure_password"
}
```

### Device Management
```bash
# Create ESP32 device
POST /devices
Authorization: Bearer <token>
{
  "device_name": "Patient Room 101",
  "device_code": "ESP32_DEVICE_001"
}

# Get all devices
GET /devices
Authorization: Bearer <token>
```

### Events & Alerts
```bash
# Get event history
GET /events?limit=50&offset=0
Authorization: Bearer <token>

# Get active alerts
GET /alerts?status=sent
Authorization: Bearer <token>

# Acknowledge alert
PUT /alerts/{alertId}
{
  "status": "acknowledged"
}
```

## 🧪 Testing the System

### Step 1: Test MQTT Connection
```bash
# Terminal 1: Start MQTT subscriber
mosquitto_sub -h localhost -t "voice/audio/#" -v

# Terminal 2: Publish test audio
mosquitto_pub -h localhost -t "voice/audio/ESP32_DEVICE_001" -f test.wav
```

### Step 2: Test Backend API
```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "password": "password123",
    "role": "caregiver"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Create device
curl -X POST http://localhost:3001/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Test Device",
    "device_code": "ESP32_TEST_001"
  }'
```

### Step 3: Test Python AI
```bash
# Directly test detection
python backend/ai/detect.py backend/tmp/test.wav

# Expected output:
# {"is_alert": 1, "keyword": "help", "level": "4", "confidence": 0.95}
```

## 🔐 Configuration Checklist

- [ ] Update WiFi SSID and password in `esp32/main/voice_recorder.c`
- [ ] Configure MQTT broker IP in `esp32/main/voice_recorder.c`
- [ ] Set unique device code for each ESP32
- [ ] Create MySQL database and import schema
- [ ] Configure `.env` file with database credentials
- [ ] Generate strong JWT_SECRET
- [ ] Get LINE Notify token and add to `.env`
- [ ] Configure CORS origin for frontend

## 📝 Documentation Files

- [Backend Documentation](./backend/README.md) - Server setup and API reference
- [ESP32 Guide](./esp32/README.md) - Hardware connections and flashing
- [Database Schema](./backend/database/smart_voice_alert.sql) - Table structure

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is available
lsof -i :3001
# Or on Windows: netstat -ano | findstr :3001

# Check environment variables
cat .env

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### ESP32 won't connect to MQTT
```bash
# Check WiFi signal
# Verify MQTT broker is running
mosquitto -v

# Test MQTT connectivity
nc -zv <MQTT_IP> 1883

# Check ESP32 logs
idf.py monitor
```

### AI detection not working
```bash
# Verify Python is installed
python --version

# Check Python dependencies
pip list | grep librosa

# Test detect.py directly
python backend/ai/detect.py backend/tmp/test.wav
```

## 📊 Database Tables

The system includes the following main tables:
- `users` - System users (admin, caregiver, patient)
- `patient_profile` - Patient medical information  
- `device` - ESP32 devices
- `event_sound` - Audio detection events
- `alert_log` - Alert delivery history
- `user_management` - Caregiver-patient relationships
- `diseases` - Disease reference data

See [smart_voice_alert.sql](./backend/database/smart_voice_alert.sql) for complete schema.

## 🚀 Deployment

### Production Checklist
- [ ] Use environment-specific configuration
- [ ] Enable SSL/HTTPS
- [ ] Setup database backups
- [ ] Configure log rotation
- [ ] Deploy with PM2 or systemd
- [ ] Setup monitoring and alerts
- [ ] Document API endpoints
- [ ] Configure firewall rules

## 📞 Support

For detailed information, refer to:
- Backend: See [backend/README.md](./backend/README.md)
- Hardware: See [esp32/README.md](./esp32/README.md)
- Database: See [backend/database/smart_voice_alert.sql](./backend/database/smart_voice_alert.sql)

## 📄 License

MIT License - Feel free to use and modify

---

**Last Updated:** April 2024  
**Version:** 1.0.0  
**Status:** Development
