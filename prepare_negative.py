import pandas as pd
import os
import shutil

# --- 1. ตั้งค่า Path โฟลเดอร์ ---
CSV_PATH = "csv/test_close_range.csv" 
SOURCE_AUDIO_DIR = "dataset/test_close" 
TARGET_NEGATIVE_DIR = "dataset/test_close/negative" 

os.makedirs(TARGET_NEGATIVE_DIR, exist_ok=True)

# --- 2. อ่านไฟล์ดัชนี CSV ---
print("กำลังอ่านไฟล์ CSV...")
df = pd.read_csv(CSV_PATH)

FILE_COLUMN = 'path'      
TEXT_COLUMN = 'sentence'  

forbidden_words = ['ช่วยด้วย', 'หมอ', 'เจ็บ', 'ปวด', 'ตก', 'เลือด', 'โอ๊ย',
                   'ไม่ไหวแล้ว','พยาบาล','ฉุกเฉิน','ด่วน','ช่วยที',
                   'ช่วยด้วยนะ','ช่วยด้วยครับ','ช่วยด้วยค่ะ']

def is_safe_to_use(text):
    if pd.isna(text): return True 
    for word in forbidden_words:
        if word in str(text): 
            return False 
    return True

print("🔍 กำลังคัดกรองเฉพาะเสียงพูดปกติ...")
df_negative = df[df[TEXT_COLUMN].apply(is_safe_to_use)]

# --- 3. สุ่มหยิบมา 1885 ไฟล์ ---
SAMPLE_SIZE = 134
if len(df_negative) > SAMPLE_SIZE:
    df_negative = df_negative.sample(n=SAMPLE_SIZE, random_state=42)

print(f"🎯 คัดมาได้ {len(df_negative)} ไฟล์ เตรียมทำการคัดลอก...")

# ✨ [ไม้ตายใหม่: ทำความเร็วแสง] สร้างแผนที่ไฟล์แค่รอบเดียว!
print("🗺️ กำลังสร้างสารบัญแผนที่ไฟล์ (Indexing)... รอแป๊บนึงครับ")
file_map = {}
for root, dirs, files in os.walk(SOURCE_AUDIO_DIR):
    for file in files:
        # จดชื่อไฟล์ (Key) และที่อยู่เต็มๆ (Value) ลงใน Dictionary
        file_map[file] = os.path.join(root, file)
print(f"✅ สร้างสารบัญเสร็จแล้ว! เจอไฟล์ในคลังทั้งหมด {len(file_map)} ไฟล์")

# --- 4. สั่งก๊อปปี้ไฟล์เข้าโฟลเดอร์ ---
success_count = 0
print("⚡ เริ่มคัดลอกไฟล์ด้วยความเร็วแสง!...")

for index, row in df_negative.iterrows():
    raw_path = str(row[FILE_COLUMN])
    filename = os.path.basename(raw_path) 
    
    # ถามหาสถานที่จากสารบัญ (เร็วปรู๊ดปร๊าด)
    actual_source = file_map.get(filename)
    
    if not actual_source and not filename.endswith('.wav'):
        actual_source = file_map.get(filename + '.wav')
        filename += '.wav'
        
    if actual_source:
        target_path = os.path.join(TARGET_NEGATIVE_DIR, filename)
        shutil.copy2(actual_source, target_path)
        success_count += 1
        
        if success_count % 200 == 0:
            print(f"คัดลอกไปแล้ว {success_count} ไฟล์...")

print("-" * 40)
print(f"🎉 เสร็จสิ้นภารกิจ! คัดลอกไฟล์ Negative สำเร็จ: {success_count} ไฟล์")