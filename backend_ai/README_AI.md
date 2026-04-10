# Guardian AI Module - README

## 🎯 Overview

This is the **AI Module** for the Guardian AI Emergency Voice Detection System. It handles:
- Audio processing and feature extraction
- Emergency keyword detection
- Model training and inference
- REST API for backend integration

**Team Member:** You  
**Deadline:** 29 May 2026 (50 days)

---

## 📂 Project Structure

```
backend_ai/
├── datasets/                 ← Training data
│   ├── emergency/           ← Emergency audio samples
│   ├── normal/              ← Normal audio samples
│   └── custom/              ← Additional training data
├── models/                  ← Trained models
│   └── model.pkl            ← Serialized model
├── train.py                 ← Training script (main)
├── inference.py             ← Inference server & API
├── utils.py                 ← Utility functions
├── requirements.txt         ← Python dependencies
└── README_AI.md             ← This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend_ai
pip install -r requirements.txt
```

### 2. Prepare Dataset

Create directories and add audio files:

```
datasets/
├── emergency/       ← Add .wav files of emergency phrases
│   ├── help1.wav
│   ├── help2.wav
│   └── ...
└── normal/          ← Add .wav files of normal speech
    ├── normal1.wav
    ├── normal2.wav
    └── ...
```

**Expected Audio Format:**
- Format: WAV (or MP3)
- Sample Rate: 16 kHz
- Channels: Mono
- Duration: 2-5 seconds per file
- Quality: Good SNR (signal-to-noise ratio)

### 3. Train Model

```bash
python train.py
```

Output:
```
✓ Dataset loaded: 150 samples
  - Normal: 75
  - Emergency: 75

📊 Training model...

✓ Training complete!
  - Train accuracy: 92.50%
  - Test accuracy: 88.00%
✓ Model saved to models/model.pkl
```

### 4. Run Inference Server

```bash
python inference.py --server 3000
```

Server listens on `http://localhost:3000`

---

## 📊 API Specification

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
    "status": "healthy",
    "service": "Guardian AI Inference",
    "timestamp": "2026-04-10T12:34:56.789"
}
```

### Audio Analysis (Critical API)

```bash
POST /api/v1/audio/analyze
Content-Type: application/json

{
    "audioBuffer": "base64_encoded_wav",
    "deviceId": "device001",
    "sampleRate": 16000,
    "duration": 3.5
}
```

**Response:**
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

**Response Field Definitions:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Processing successful |
| `isAlert` | 0/1 | Alert detected |
| `keyword` | string | Detected keyword |
| `level` | 1-4 | Alert severity level |
| `confidence` | 0-1 | Prediction confidence |
| `transcribedText` | string | Speech transcription |
| `processingTime` | int | Processing time (ms) |

---

## 🎙️ Alert Levels & Keywords

| Level | Name | Keywords | Confidence Threshold |
|-------|------|----------|----------------------|
| 4 | **Critical** | help, ช่วย, ฉุกเฉิน, crisis | ≥ 0.95 |
| 3 | **High** | hurt, pain, ไม่สบาย, ปวด | ≥ 0.85 |
| 2 | **Medium** | medicine, needed, ต้องการ, ยา | ≥ 0.70 |
| 1 | **Low** | call, ok, สวัสดี, โอเค | ≥ 0.50 |

---

## 🧠 Model Architecture

Current implementation uses **Random Forest** with:
- **Features:** MFCC (13 coefficients) + Spectral features
- **Training:** 80/20 train/test split
- **Trees:** 100 estimators
- **Max Depth:** 15 levels

### Future Improvements:
- [ ] Switch to Deep Learning (CNN/LSTM)
- [ ] Integrate OpenAI Whisper for STT
- [ ] Multi-language support
- [ ] Real-time keyword spotting

---

## 📈 Training & Validation

### Commands

```bash
# Train model
python train.py

# Test with existing model
python train.py --test

# Run inference server
python inference.py --server 3000

# Test inference endpoint
curl -X POST http://localhost:3000/api/v1/audio/analyze \
  -H "Content-Type: application/json" \
  -d '{"audioBuffer":"<base64>","deviceId":"test001"}'
```

### Expected Performance Targets

- **Accuracy:** > 85%
- **Precision:** > 90%
- **Recall:** > 80%
- **False Positive Rate:** < 5%
- **Processing Time:** < 500ms per audio

---

## 🔗 Integration with Backend

The Backend (Kittiwat) will call the AI API when receiving audio via MQTT:

```
ESP32 → MQTT → Backend → AI API (POST /api/v1/audio/analyze) → Response
```

**Backend calls:**
```go
// Example Go code (Kittiwat's responsibility)
analysisResult := callAIAPI(audioBuffer)
// Store result in PostgreSQL
saveEventSound(analysisResult)
```

---

## 📝 Work Log / Milestones

- [ ] Dataset preparation (target: 200+ samples per class)
- [ ] Model training v1 (target: >80% accuracy)
- [ ] API implementation & testing
- [ ] Integration testing with backend
- [ ] Performance optimization
- [ ] Final model tuning
- [ ] Documentation & handoff

---

## 🐛 Troubleshooting

### Issue: "No module named 'librosa'"
```bash
pip install librosa
```

### Issue: "Model not found"
Ensure you have trained the model first:
```bash
python train.py
```

### Issue: Poor accuracy
- Add more training data
- Check audio quality
- Ensure proper audio normalization
- Try different model architectures

### Issue: Slow inference
- Reduce model complexity
- Optimize feature extraction
- Consider GPU acceleration

---

## 📞 Team Communication

**Backend (Kittiwat):**
- Ensures AI API is called after receiving MQTT audio
- Stores analysis results in database
- Sends LINE Notify alerts

**Mobile (Ball):**
- Displays detected keywords & alert levels
- Shows real-time status
- Allows manual testing

**AI (You):**
- Trains and improves model
- Maintains API server
- Documents performance metrics

---

## 📚 References

- [LOTUSDIS Dataset](https://lotus.kucc.ku.ac.th/) - Thai speech database
- [Librosa Documentation](https://librosa.org/)
- [Scikit-learn](https://scikit-learn.org/)
- [OpenAI Whisper](https://github.com/openai/whisper)

---

## 🔒 Important Notes

1. **API Contract:** The response format in `inference.py` is **FIXED** - don't change it unless all team members agree
2. **Processing Time:** Aim for < 500ms for backend to not timeout
3. **Model Versioning:** Save new models with version numbers (model_v1.pkl, model_v2.pkl)
4. **Dataset Privacy:** Don't commit raw audio files - use .gitignore

---

**Last Updated:** 10 April 2026  
**Status:** Ready for training  
**Next Phase:** Dataset collection and model training
