import os
import torch
import librosa
import numpy as np
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

# ==========================================
# ⚙️ 1. ตั้งค่าโฟลเดอร์
# ==========================================
audio_folder = "test_audio" # 👈 สร้างโฟลเดอร์ชื่อนี้ แล้วเอาไฟล์เสียงไปใส่ได้เลย
model_path = "models/whisper-classifier-final"

# ==========================================
# 🧠 2. โหลดโมเดล
# ==========================================
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 กำลังโหลดโมเดลบนอุปกรณ์: {device}")

extractor = AutoFeatureExtractor.from_pretrained(model_path)
model = AutoModelForAudioClassification.from_pretrained(model_path).to(device)
model.eval()

# สร้างโฟลเดอร์ให้อัตโนมัติถ้ายังไม่มี
if not os.path.exists(audio_folder):
    os.makedirs(audio_folder)
    print(f"\n📁 สร้างโฟลเดอร์ '{audio_folder}' ให้แล้วครับ!")
    print(f"กรุณานำไฟล์เสียง (.wav หรือ .mp3) ไปใส่ในโฟลเดอร์นี้ แล้วรันโค้ดใหม่อีกครั้งครับ")
    exit()

# ==========================================
# 🔍 3. เริ่มสแกนและวิเคราะห์ไฟล์
# ==========================================
files = [f for f in os.listdir(audio_folder) if f.lower().endswith(('.wav', '.mp3'))]

if len(files) == 0:
    print(f"\n⚠️ ไม่พบไฟล์เสียงในโฟลเดอร์ '{audio_folder}' ครับ")
else:
    print(f"\n🔎 พบไฟล์เสียงทั้งหมด {len(files)} ไฟล์ เริ่มทำการวิเคราะห์...\n")
    print("=" * 65)
    print(f"{'ชื่อไฟล์':<25} | {'สถานะ':<15} | {'ความมั่นใจ (AI)'}")
    print("=" * 65)

    for filename in files:
        file_path = os.path.join(audio_folder, filename)
        
        try:
            # โหลดเสียง
            audio_data, _ = librosa.load(file_path, sr=16000)
            
            # บังคับตัด/เติม ให้ได้ 5 วินาทีเป๊ะๆ (80000 samples)
            TARGET_LENGTH = 16000 * 5
            if len(audio_data) > TARGET_LENGTH:
                audio_input = audio_data[:TARGET_LENGTH]
            else:
                padding = TARGET_LENGTH - len(audio_data)
                audio_input = np.pad(audio_data, (0, padding), 'constant')
                
            # ให้ AI วิเคราะห์
            inputs = extractor(audio_input, sampling_rate=16000, return_tensors="pt").to(device)
            with torch.no_grad():
                logits = model(**inputs).logits
                probs = torch.softmax(logits, dim=-1)
                
                # ดึงความน่าจะเป็นของ "คลาส 1 (Emergency)"
                emergency_prob = probs[0][1].item()

            # ตัดสินใจ (Threshold 70%)
            if emergency_prob >= 0.70:
                status = " Emergency"
            else:
                status = " Normal"

            # ปริ้นผลลัพธ์ทีละไฟล์
            print(f"{filename[:20]:<25} | {status:<15} | {emergency_prob*100:>6.2f} %")
            
        except Exception as e:
            print(f"{filename[:20]:<25} | ❌ Error         | {str(e)}")

    print("=" * 65)
    print("✅ วิเคราะห์เสร็จสิ้นครบทุกไฟล์!")
