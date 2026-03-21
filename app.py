from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import librosa
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
import io
import uvicorn  # 👈 เพิ่ม import uvicorn
import numpy as np # 👈 ✨ เพิ่ม numpy สำหรับเติมความยาวเสียง (Padding)

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
async def predict(audio: UploadFile = File(...)): 
    try:
        # รับไฟล์เสียงจากหน้าเว็บ
        content = await audio.read()
        audio_data, _ = librosa.load(io.BytesIO(content), sr=16000)
        
        # 🛠️ [แก้บั๊กที่ 1] จัดการความยาวเสียงให้เป็น 5 วินาทีเป๊ะๆ (80000 samples)
        TARGET_LENGTH = 16000 * 5
        if len(audio_data) > TARGET_LENGTH:
            audio_input = audio_data[:TARGET_LENGTH] # ถ้ายาวไป ให้ตัดส่วนเกินทิ้ง
        else:
            padding = TARGET_LENGTH - len(audio_data)
            audio_input = np.pad(audio_data, (0, padding), 'constant') # ถ้าสั้นไป เติมศูนย์ (ความเงียบ) ให้ครบ 5 วิ
        
        # ให้ AI วิเคราะห์
        inputs = extractor(audio_input, sampling_rate=16000, return_tensors="pt").to(device)
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)
            
            # 🛠️ [แก้บั๊กที่ 2] ดึงเฉพาะค่าเปอร์เซ็นต์ของ "คลาส 1 (Emergency)" มาใช้งานเสมอ
            emergency_prob = probs[0][1].item()

        # ⚠️ 3. ส่งผลลัพธ์ให้ตรงกับที่ Frontend (index.html) เขียนเช็กเอาไว้ (ใช้ Threshold 85%)
        status = "emergency" if emergency_prob >= 0.85 else "normal"
        
        return {
            "status": status,
            "confidence": emergency_prob
        }
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

# 👇 4. ฝังคำสั่งรันเซิร์ฟเวอร์ไว้ในไฟล์เลย จบๆ!
if __name__ == "__main__":
    print("🟢 กำลังสตาร์ทระบบ Smart Ward Backend...")
    uvicorn.run(app, host="0.0.0.0", port=5000)