from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import librosa
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
import io

app = FastAPI()

# 🔓 1. เปิดให้หน้าเว็บเรียกข้ามเครื่องได้ (ป้องกัน Error ขอบแดงที่เบราว์เซอร์)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧠 2. โหลดโมเดล
model_path = "models/whisper-classifier-final" # ตรวจสอบ Path ให้ถูกต้อง
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 กำลังโหลดโมเดลบนอุปกรณ์: {device}")

extractor = AutoFeatureExtractor.from_pretrained(model_path)
model = AutoModelForAudioClassification.from_pretrained(model_path).to(device)
model.eval()

@app.post("/predict")
async def predict(audio: UploadFile = File(...)): # ⚠️ ในหน้าเว็บคุณส่งไฟล์มาชื่อ 'audio' ไม่ใช่ 'file'
    try:
        # รับไฟล์เสียงจากหน้าเว็บ
        content = await audio.read()
        audio_data, _ = librosa.load(io.BytesIO(content), sr=16000)
        
        # ตัดเหลือ 5 วินาที
        audio_input = audio_data[:16000 * 5]
        
        # ให้ AI วิเคราะห์
        inputs = extractor(audio_input, sampling_rate=16000, return_tensors="pt").to(device)
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)
            prediction = torch.argmax(logits, dim=-1).item()
            confidence = probs[0][prediction].item()

        # ⚠️ 3. ส่งผลลัพธ์ให้ตรงกับที่ Frontend (index.html) เขียนเช็กเอาไว้
        status = "emergency" if prediction == 1 else "normal"
        return {
            "status": status,
            "confidence": confidence
        }
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}