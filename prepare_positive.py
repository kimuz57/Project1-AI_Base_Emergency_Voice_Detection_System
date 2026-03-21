import csv
import os
import shutil

# --- 1. ตั้งค่า Path โฟลเดอร์ ---
CSV_PATH = "csv/test_close_range.csv"          
# ✨ ชี้ไปที่โฟลเดอร์หลักกว้างๆ ไว้ก่อน ให้ระบบมุดหาเอง
SOURCE_AUDIO_DIR = "dataset/test_close" 
TARGET_POSITIVE_DIR = "dataset/test_close/positive" 

os.makedirs(TARGET_POSITIVE_DIR, exist_ok=True)

target_words = ['ช่วยด้วย', 'หมอ', 'เจ็บ', 'ปวด', 'ตก', 'เลือด', 'โอ๊ย',
                'ไม่ไหวแล้ว','พยาบาล','ฉุกเฉิน','ด่วน','ช่วยที',
                'ช่วยด้วยนะ','ช่วยด้วยครับ','ช่วยด้วยค่ะ']

def contains_keyword(text):
    if not text: return False
    for word in target_words:
        if word in str(text): 
            return True
    return False

print("⏳ กำลังงมเข็มในมหาสมุทร (หาคำฉุกเฉินในห้องประชุม)...")

found_files = []
# --- 2. อ่านไฟล์ CSV ---
with open(CSV_PATH, 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    FILE_COLUMN = 'path'
    TEXT_COLUMN = 'sentence'
    
    for row in reader:
        text = row.get(TEXT_COLUMN, "")
        raw_path = row.get(FILE_COLUMN, "")
        
        if raw_path and contains_keyword(text):
            filename = os.path.basename(raw_path)
            found_files.append((filename, text))

print(f"🎯 เจอประโยคที่มีคำเป้าหมายทั้งหมด {len(found_files)} ไฟล์")

# ✨ [ไม้ตายใหม่: ทำความเร็วแสง] สร้างสารบัญแผนที่ไฟล์ (Indexing)
print("🗺️ กำลังสร้างสารบัญแผนที่ไฟล์ (Indexing)... รอแป๊บนึงครับ")
file_map = {}
for root, dirs, files in os.walk(SOURCE_AUDIO_DIR):
    for file in files:
        # จดชื่อไฟล์ (Key) และที่อยู่เต็มๆ (Value) ลงใน Dictionary
        file_map[file] = os.path.join(root, file)
print(f"✅ สร้างสารบัญเสร็จแล้ว! เจอไฟล์ในคลังทั้งหมด {len(file_map)} ไฟล์")

# --- 3. สั่งก๊อปปี้ไฟล์ ---
print("⚡ เริ่มคัดลอกไฟล์ด้วยความเร็วแสง!...")
success_count = 0

for filename, text in found_files:
    # ถามหาสถานที่จากสารบัญ (เร็วปรู๊ดปร๊าด)
    actual_source = file_map.get(filename)
    
    # ถ้าหาชื่อเดิมไม่เจอ ลองเติม .wav แล้วหาใหม่
    if not actual_source and not filename.endswith('.wav'):
         actual_source = file_map.get(filename + '.wav')
         filename += '.wav' # อัปเดตชื่อตอนเซฟให้เป็น .wav ด้วย
    
    # ถ้าเจอตัวไฟล์แล้ว ให้ก๊อปปี้เลย!
    if actual_source:
        target_path = os.path.join(TARGET_POSITIVE_DIR, filename)
        shutil.copy2(actual_source, target_path)
        success_count += 1
        
        if success_count % 200 == 0:
            print(f"คัดลอกไปแล้ว {success_count} ไฟล์...")

print("-" * 40)
print(f"🎉 เสร็จสิ้น! ก๊อปปี้ไฟล์ Positive สำเร็จ: {success_count} ไฟล์")