# Guardian AI - Backend Server

## Overview
Complete Node.js backend server for the Guardian AI Emergency Voice Detection System. Handles MQTT communication, audio processing, database operations, and real-time notifications.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         ESP32 Device (INMP441 Microphone)               │
└────────────────────┬────────────────────────────────────┘
                     │ MQTT
                     ▼
        ┌──────────────────────────────┐
        │  Mosquitto MQTT Broker       │
        │  (localhost:1883)            │
        └────────────┬─────────────────┘
                     │
                     │ voice/audio/#
                     ▼
      ┌────────────────────────────────────┐
      │  Backend Node.js Server            │
      │  (localhost:3001)                  │
      │                                    │
      │  ├─ MQTT Client                    │
      │  ├─ Audio Queue                    │
      │  ├─ AI Service (Python)            │
      │  ├─ Express API Routes             │
      │  └─ Socket.io Real-time Events     │
      └────────────────────────────────────┘
                     │
         ┌───────────┼────────────────┐
         │           │                 │
         ▼           ▼                 ▼
    ┌────────┐ ┌──────────┐ ┌────────────┐
    │ MySQL  │ │ Python   │ │ LINE       │
    │AsyncIO │ │ AI       │ │ Notify API │
    │Database│ │ detect.py│ │ Services   │
    └────────┘ └──────────┘ └────────────┘
         │
         ▼
    ┌──────────────┐
    │ Frontend     │
    │ (Next.js)    │
    └──────────────┘
```

## Installation

### 1. Prerequisites
- Node.js v16+ and npm
- MySQL 5.7 or later
- Python 3.8+ (for AI detection)
- Mosquitto MQTT broker
- Git

### 2. Clone and Install

```bash
# Navigate to backend directory
cd backend

# Install Node.js dependencies
npm install

# Or with yarn
yarn install
```

### 3. Database Setup

```bash
# Connect to MySQL
mysql -u root -p

# Run the SQL schema
source backend/database/smart_voice_alert.sql

# Or import via command line
mysql -u root -p smart_voice_alert < backend/database/smart_voice_alert.sql
```

### 4. Configuration

Edit `.env` file with your settings:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_voice_alert

# JWT
JWT_SECRET=your_super_secret_key_here_minimum_32_characters
JWT_EXPIRE=8h

# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883

# LINE Notify
LINE_NOTIFY_TOKEN=your_line_notify_token

# File Paths
UPLOAD_DIR=./uploads
TMP_DIR=./tmp

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Getting LINE Notify Token:**
1. Visit [LINE Notify](https://notify-bot.line.me/)
2. Click "Connect"
3. Allow permissions
4. Copy your personal token
5. Paste in `.env`

### 5. Python AI Setup (Optional)

Install Python dependencies for AI detection:

```bash
# Install required packages
pip install librosa numpy scipy

# Or for Whisper STT (larger model)
pip install openai-whisper
```

## Running the Server

### Development Mode
```bash
npm run dev
```

Uses nodemon for auto-restart on file changes.

### Production Mode
```bash
npm start
```

### Check Health Status
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "success": true,
  "message": "Server is running",
  "uptime": 12345.67,
  "services": {
    "mqtt": {
      "connected": true,
      "broker": "localhost:1883"
    },
    "audioQueue": {
      "queueLength": 0,
      "isProcessing": false
    }
  }
}
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/profile` - Get current user profile

### Devices (ESP32)
- `GET /devices` - List all devices
- `POST /devices` - Create new device
- `GET /devices/:deviceId` - Get device details
- `PUT /devices/:deviceId` - Update device
- `DELETE /devices/:deviceId` - Delete device

### Patients
- `GET /patients` - List all patients
- `POST /patients` - Create patient profile
- `GET /patients/:patientId` - Get patient details
- `PUT /patients/:patientId` - Update patient
- `POST /patients/:patientId/diseases` - Add disease to patient

### Events
- `GET /events` - Get all events (paginated)
- `GET /events/:eventId` - Get event details
- `GET /events/summary/stats` - Get statistics

### Alerts
- `GET /alerts` - List alerts
- `PUT /alerts/:alertId` - Update alert status
- `GET /alerts/summary/dashboard` - Get alert summary

## Testing with Postman

### 1. Register User
```
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "phone_number": "0812345678",
  "role": "caregiver"
}
```

### 2. Login
```
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

Copy the returned JWT token.

### 3. Create Device
```
POST http://localhost:3001/devices
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "device_name": "Patient Room 101",
  "device_code": "ESP32_DEVICE_001"
}
```

### 4. Create Patient
```
POST http://localhost:3001/patients
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "user_id": 1,
  "id_card": "1234567890123",
  "gender": "male",
  "blood_group": "O+",
  "weight": 70.5,
  "height": 175.0
}
```

## MQTT Testing

### Subscribe to Audio Events
```bash
mosquitto_sub -h localhost -t "voice/audio/#" -v
```

### Subscribe to Device Status
```bash
mosquitto_sub -h localhost -t "device/status/#" -v
```

### Publish Test Audio
```bash
# Create a test WAV file first
mosquitto_pub -h localhost -t "voice/audio/ESP32_DEVICE_001" -f test_audio.wav
```

## File Structure

```
backend/
├── server.js                 # Main Express server
├── package.json             # Node.js dependencies
├── .env                     # Configuration
│
├── config/
│   └── db.js               # MySQL connection pool
│
├── middleware/
│   └── auth.js             # JWT verification
│
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── devices.js          # Device management
│   ├── patients.js         # Patient management
│   ├── events.js           # Event history
│   └── alerts.js           # Alert management
│
├── services/
│   ├── mqttClient.js       # MQTT subscriber
│   ├── audioQueue.js       # Audio processing queue
│   ├── aiService.js        # AI service integration
│   └── lineNotify.js       # LINE notification API
│
├── ai/
│   └── detect.py           # Python ML model
│
├── database/
│   └── smart_voice_alert.sql  # Database schema
│
└── tmp/                    # Temporary audio files
```

## Logging

All major operations are logged with timestamps:

```
[2024-01-15T10:30:45.123Z] [MQTT] Connected to MQTT broker
[2024-01-15T10:30:46.456Z] [Queue] Added audio to queue. Queue length: 1
[2024-01-15T10:30:48.789Z] [AI] Starting audio processing: 1705324248123_ESP32_DEVICE_001.wav
[2024-01-15T10:30:50.012Z] [AI] Detection result: alert=true, keyword="help", confidence=0.95
[2024-01-15T10:30:51.234Z] [LINE] Notification sent successfully
```

## Troubleshooting

### MQTT Connection Failed
```
✗ MQTT error: connect ECONNREFUSED
```
**Solution:** Ensure Mosquitto is running:
```bash
mosquitto -v
```

### Database Connection Failed
```
✗ Database connection failed: getaddrinfo ENOTFOUND localhost
```
**Solution:** Check MySQL is running and credentials are correct:
```bash
mysql -u root -p
```

### Python AI Timeout
```
[AI] AI processing timeout
```
**Solution:** Increase `AI_SERVICE_TIMEOUT` in `.env` or optimize detect.py

### Audio File Not Found
```
Error: Audio file not found
```
**Solution:** Ensure ESP32 is connected to MQTT broker and sending audio

## Performance Optimization

1. **Database:** Add indexes on frequently queried columns
2. **MQTT:** Adjust DMA buffer size for audio quality
3. **AI Service:** Implement model caching for faster inference
4. **Queue:** Monitor queue length and adjust concurrency

## Security Notes

- Change `JWT_SECRET` to a strong random string
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Store passwords securely with bcrypt
- Rotate LINE Notify tokens regularly

## Monitoring

Monitor server health:
```bash
curl http://localhost:3001/status
```

## Production Deployment

### Using PM2
```bash
npm install -g pm2

pm2 start server.js --name "guardian-ai-backend"
pm2 save
pm2 startup

# Monitor
pm2 monit
```

### Using Docker
```bash
docker build -t guardian-ai-backend .
docker run -p 3001:3001 --env-file .env guardian-ai-backend
```

## Contributing

1. Create feature branch
2. Commit changes
3. Push to repository
4. Create pull request

## License

MIT License

## Support

For issues and questions, contact the development team.
