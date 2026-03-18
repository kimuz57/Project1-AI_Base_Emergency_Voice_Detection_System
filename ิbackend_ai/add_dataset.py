import os
import random
from datetime import datetime
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from pydub import AudioSegment
from pydub.silence import split_on_silence

app = Flask(__name__)
# อนุญาตให้ Next.js ส่งข้อมูลเข้ามาได้
CORS(app) 

# สร้างโฟลเดอร์สำหรับเก็บไฟล์เสียงชั่วคราว
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# ✂️ ฟังก์ชันตัดเสียงเงียบ (สำคัญมากสำหรับทำ Dataset ที่สะอาด)
# ==========================================
def extract_voice_only(input_file, output_file):
    try:
        audio = AudioSegment.from_file(input_file)
        chunks = split_on_silence(
            audio,
            min_silence_len=500,
            silence_thresh=audio.dBFS - 14,
            keep_silence=200
        )
        if not chunks:
            return False
        
        processed_audio = sum(chunks)
        processed_audio.export(output_file, format="wav")
        return True
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการตัดเสียง: {e}")
        return False

# ==========================================
# 🚀 API รับไฟล์เสียงจากหน้าเว็บ (โหมดสร้าง Dataset)
# ==========================================
@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    if 'audio_file' not in request.files:
        return jsonify({'message': 'ไม่มีไฟล์ส่งมา'}), 400
    
    file = request.files['audio_file']
    if file.filename == '':
        return jsonify({'message': 'ไม่ได้เลือกไฟล์'}), 400

    if file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        random_id = uuid.uuid4().hex[:4]
        
        # ตั้งชื่อไฟล์
        input_filename = f"record_{timestamp}_{random_id}.webm"
        output_filename = f"clean_{timestamp}_{random_id}.wav"
        
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        # 1. เซฟไฟล์ต้นฉบับ
        file.save(input_path)
        print(f"📥 กำลังบันทึกไฟล์เพื่อทำ Dataset...")
        
        # 2. นำไปตัดเสียงเงียบให้ไฟล์สะอาด
        has_voice = extract_voice_only(input_path, output_path)
        
        # ลบไฟล์ webm ต้นฉบับทิ้งเพื่อไม่ให้รก
        if os.path.exists(input_path):
            os.remove(input_path) 
            
        if not has_voice:
            return jsonify({'status': 'normal', 'message': 'ไม่พบเสียงพูดในคลิป (ไฟล์ถูกปัดตก)'}), 200
        
        print(f"✅ สร้างไฟล์ Dataset สำเร็จ! เข้าไปก๊อปปี้ได้ที่: {output_path}")
        
        # 3. สุ่มผลลัพธ์หลอกๆ กลับไป เพื่อให้หน้าเว็บ Dashboard ไม่ค้าง
        mock_result = random.choice(["normal", "help"])
        
        # 🌟 จุดสำคัญ: ไม่มีการคำสั่ง os.remove(output_path) แล้ว ไฟล์จะนอนรอคุณอยู่ในโฟลเดอร์ uploads 🌟
            
        return jsonify({'status': mock_result, 'message': 'บันทึก Dataset สำเร็จ'}), 200 

if __name__ == '__main__':
    app.run(port=5000, debug=True)