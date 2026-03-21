import os
import torch
import librosa
import pandas as pd
from tqdm.auto import tqdm
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

# 1. ตั้งค่า Path (เช็กชื่อโฟลเดอร์ในแถบ Data ด้านขวาให้ตรงนะครับ)
model_path = "/kaggle/input/models/suphakit123/whisperv2/pytorch/default/1/whisper-classifier-final" 
test_base_path = "/kaggle/input/datasets/suphakit123"

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# 2. โหลดโมเดลที่คุณเพิ่งอัปโหลด
print("⏳ กำลังโหลดตัวประมวลผลเสียงจาก OpenAI...")
extractor = AutoFeatureExtractor.from_pretrained("openai/whisper-medium")

# extractor = AutoFeatureExtractor.from_pretrained(model_path)
# model = AutoModelForAudioClassification.from_pretrained(model_path).to(device)
# model.eval()

# 3. เตรียมรายการโฟลเดอร์ที่จะเทส
# ผมรวมทุกโฟลเดอร์ที่มีคำว่า 'pos' และ 'neg' มาเช็กทั้งหมด
test_folders = {
    "test-positive": 1,
    "test-negative": 0,
    "pos-close": 1, # ลองเอาตัวที่เคยเทรนมาเช็กด้วยว่าจำแม่นไหม
    "neg-close": 0
}

summary = []

print("🕵️‍♂️ เริ่มการทดสอบแบบปูพรมทุกไฟล์...")

for folder_name, true_label in test_folders.items():
    folder_path = os.path.join(test_base_path, folder_name)
    
    if not os.path.exists(folder_path):
        print(f"⚠️ ไม่พบโฟลเดอร์: {folder_name} (ข้าม)")
        continue
        
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.wav', '.mp3'))]
    correct = 0
    total = len(files)
    
    print(f"\n📂 หมวด: {folder_name} ({total} ไฟล์)")
    
    for filename in tqdm(files):
        path = os.path.join(folder_path, filename)
        try:
            # โหลดเสียงและสกัดฟีเจอร์
            audio, _ = librosa.load(path, sr=16000)
            # inputs = extractor(audio[:16000*8], sampling_rate=16000, return_tensors="pt").to(device)
            inputs = extractor(audio[:16000*5], sampling_rate=16000, return_tensors="pt").to(device)
            
            with torch.no_grad():
                logits = model(**inputs).logits
                prediction = torch.argmax(logits, dim=-1).item()
                
            if prediction == true_label:
                correct += 1
        except Exception as e:
            print(f"Error {filename}: {e}")
            
    accuracy = (correct / total) * 100 if total > 0 else 0
    summary.append({"Folder": folder_name, "Total": total, "Correct": correct, "Accuracy (%)": f"{accuracy:.2f}%"})

# 4. แสดงตารางสรุปผล
df_result = pd.DataFrame(summary)
print("\n📊 === สรุปผลการทดสอบทั้งหมด ===")
print(df_result.to_string(index=False))

# คำนวณ Overall
total_all = sum([s['Total'] for s in summary])
correct_all = sum([s['Correct'] for s in summary])
print(f"\n🌟 OVERALL ACCURACY: {(correct_all/total_all)*100:.2f}%")