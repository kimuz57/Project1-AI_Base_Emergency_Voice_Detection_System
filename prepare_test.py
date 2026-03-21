import csv
import os
import shutil
import random

# --- 1. ตั้งค่า Path โฟลเดอร์ ---
CSV_PATH = "csv/test.csv" 
SOURCE_AUDIO_DIR = "raw_data/test"

# ✨ สร้างโฟลเดอร์แยกเป็น Positive (เฉลย=1) และ Negative (เฉลย=0)
TARGET_POS_DIR = "dataset/test_close/positive" 
TARGET_NEG_DIR = "dataset/test_close/negative" 

os.makedirs(TARGET_POS_DIR, exist_ok=True)
os.makedirs(TARGET_NEG_DIR, exist_ok=True)

target_words = ['ช่วยด้วย', 'หมอ', 'เจ็บ', 'ปวด', 'ตก', 'เลือด', 'โอ๊ย',
                'ไม่ไหวแล้ว','พยาบาล','ฉุกเฉิน','ด่วน','ช่วยที',
                'ช่วยด้วยนะ','ช่วยด้วยครับ','ช่วยด้วยค่ะ']

def contains_keyword(text):
    if not text: return False
    for word in target_words:
        if word in str(text): 
            return True
    return False

print("⏳ กำลังแยกแยะข้อสอบ (ฉุกเฉิน vs ปกติ)...")

pos_files = [] # เก็บรายชื่อไฟล์ฉุกเฉิน
neg_files = [] # เก็บรายชื่อไฟล์ปกติ

# --- 2. อ่านไฟล์ CSV และคัดแยก ---
with open(CSV_PATH, 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    FILE_COLUMN = 'path'
    TEXT_COLUMN = 'sentence'
    
    for row in reader:
        text = row.get(TEXT_COLUMN, "")
        raw_path = row.get(FILE_COLUMN, "")
        
        if raw_path:
            filename = os.path.basename(raw_path)
            # แยกฝั่งชัดเจน!
            if contains_keyword(text):
                pos_files.append(filename)
            else:
                neg_files.append(filename)

print(f"🎯 เจอข้อสอบฉุกเฉิน (Positive): {len(pos_files)} ไฟล์")
print(f"🎯 เจอข้อสอบปกติ (Negative): {len(neg_files)} ไฟล์")

# --- 3. สั่งก๊อปปี้ไฟล์เข้าโฟลเดอร์เฉลย ---
# 3.1 คัดลอก Positive ทั้งหมด
pos_count = 0
for filename in pos_files:
    if not filename.endswith('.wav'): filename += '.wav'
    src = os.path.join(SOURCE_AUDIO_DIR, filename)
    dst = os.path.join(TARGET_POS_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        pos_count += 1

# 3.2 คัดลอก Negative (สุ่มมาให้จำนวนเท่ากับ Positive จะได้แฟร์ๆ)
neg_count = 0
# สุ่มเอาไฟล์ Negative มาจำนวนเท่ากับ Positive
selected_neg = random.sample(neg_files, min(len(pos_files), len(neg_files))) 

for filename in selected_neg:
    if not filename.endswith('.wav'): filename += '.wav'
    src = os.path.join(SOURCE_AUDIO_DIR, filename)
    dst = os.path.join(TARGET_NEG_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        neg_count += 1

print("-" * 40)
print(f"🎉 เสร็จสิ้น! เตรียมชุดทดสอบพร้อมเฉลยเรียบร้อย")
print(f"✅ คัดลอก Positive: {pos_count} ไฟล์ (อยู่ใน test/positive)")
print(f"✅ คัดลอก Negative: {neg_count} ไฟล์ (อยู่ใน test/negative)")
