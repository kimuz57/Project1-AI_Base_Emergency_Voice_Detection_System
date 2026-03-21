from fastapi import FastAPI, UploadFile, File
import torch
import librosa
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
import io

app = FastAPI()

# โหลดโมเดล (แก้ path ให้ตรงกับที่วางในเครื่อง)
model_path = "models/whisper-classifier-final" #Model path
device = "cuda" if torch.cuda.is_available() else "cpu"
extractor = AutoFeatureExtractor.from_pretrained(model_path)
model = AutoModelForAudioClassification.from_pretrained(model_path).to(device)
model.eval()

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 1. รับไฟล์เสียงจากหน้าเว็บ
    request_object_content = await file.read()
    audio_data, _ = librosa.load(io.BytesIO(request_object_content), sr=16000)
    
    # 2. ตัดเหลือ 5 วินาทีตามที่เทสแล้วว่าดี
    audio_input = audio_data[:16000 * 5]
    
    # 3. ให้ AI วิเคราะห์
    inputs = extractor(audio_input, sampling_rate=16000, return_tensors="pt").to(device)
    with torch.no_grad():
        logits = model(**inputs).logits
        prediction = torch.argmax(logits, dim=-1).item()
    
    label = "Emergency 🚨" if prediction == 1 else "Normal ✅"
    return {"result": label, "confidence": torch.softmax(logits, dim=-1).max().item()}

# รันด้วยคำสั่ง: uvicorn main:app --host 0.0.0.0 --port 8000