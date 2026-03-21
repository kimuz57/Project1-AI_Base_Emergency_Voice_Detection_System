import pandas as pd
import os

# 1. โหลดไฟล์ (ตรวจสอบ path ให้ถูกต้อง)
file_path = 'csv/test.csv' # แก้ชื่อให้ตรงกับไฟล์จริงของคุณ
df = pd.read_csv(file_path)

# 2. ตรวจสอบค่าในคอลัมน์ mic เพื่อดูระยะ
# ปกติ Lotus-Corpus ระยะใกล้ (Close-talk) มักใช้รหัสไมค์บางตัว 
# เช่น ถ้า 'con123' คือระยะใกล้ที่เราต้องการ
close_mics = ['con123','lav123'] # เพิ่มรหัสไมค์ตัวอื่นๆ ที่เป็นระยะใกล้ลงใน list นี้

# 3. กรองเฉพาะระยะใกล้
df_close = df[df['mic'].isin(close_mics)]

# 4. เซฟเป็นไฟล์ใหม่
output_path = 'csv/test_close_range.csv'
df_close.to_csv(output_path, index=False)

print(f"เสร็จเรียบร้อย! กรองเหลือข้อมูลระยะใกล้ {len(df_close)} แถว")
print(f"บันทึกไฟล์ไปที่: {output_path}")