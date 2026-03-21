import pandas as pd
import os
import shutil
from tqdm import tqdm

# --- ตั้งค่าตำแหน่งโฟลเดอร์ ---
csv_path = 'csv/test_close_range.csv'
source_dir = 'D:/project_kws/raw_data/test'   
target_dir = 'D:/project_kws/dataset/test_close' 

# 1. อ่านไฟล์ CSV
df = pd.read_csv(csv_path)

print(f"กำลังเริ่มคัดลอกไฟล์เสียงจำนวน {len(df)} ไฟล์...")

# 2. สร้างโฟลเดอร์ปลายทางรอไว้เลย
os.makedirs(target_dir, exist_ok=True)

copy_count = 0
error_count = 0

# 3. วนลูปคัดลอกไฟล์
for index, row in tqdm(df.iterrows(), total=len(df)):
    # พระเอกของงานนี้: os.path.basename จะดึงมาแค่ "ชื่อไฟล์.wav" ตัด path โฟลเดอร์ทิ้งหมด
    file_name = os.path.basename(row['path'])
    
    # ประกอบร่างใหม่
    src_file = os.path.join(source_dir, file_name)
    dst_file = os.path.join(target_dir, file_name)
    
    # 4. ทำการคัดลอก
    if os.path.exists(src_file):
        shutil.copy2(src_file, dst_file)
        copy_count += 1
    else:
        error_count += 1

print(f"\n--- คัดลอกเสร็จสิ้น ---")
print(f"คัดลอกสำเร็จ: {copy_count} ไฟล์")
print(f"หาไฟล์ไม่พบ: {error_count} ไฟล์")
print(f"ไฟล์ทั้งหมดถูกรวมไว้ที่: {target_dir}")