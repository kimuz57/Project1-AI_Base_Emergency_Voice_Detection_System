import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from pydub import AudioSegment

app = Flask(__name__)
CORS(app) 

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# ✂️ ฟังก์ชันหั่นเสียงเป็นส่วนๆ ส่วนละ 5 วินาที
# ==========================================
def chunk_audio(input_file, output_folder_name):
    try:
        audio = AudioSegment.from_file(input_file)
        
        # กำหนดความยาวที่ต้องการ (5 วินาที = 5000 มิลลิวินาที)
        chunk_length_ms = 5000 
        chunks = []
        
        # วนลูปตัดไฟล์
        for i in range(0, len(audio), chunk_length_ms):
            chunk = audio[i:i + chunk_length_ms]
            chunks.append(chunk)
            
        # สร้างโฟลเดอร์ย่อยสำหรับชุดไฟล์นี้เพื่อความเป็นระเบียบ
        subfolder_path = os.path.join(UPLOAD_FOLDER, output_folder_name)
        os.makedirs(subfolder_path, exist_ok=True)
        
        # บันทึกแต่ละส่วนลงเครื่อง
        for i, chunk in enumerate(chunks):
            chunk_filename = f"chunk_{i}.wav"
            chunk.export(os.path.join(subfolder_path, chunk_filename), format="wav")
            
        return len(chunks)
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการหั่นไฟล์: {e}")
        return 0

# ==========================================
# 🚀 API รับไฟล์เสียง
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
        unique_id = uuid.uuid4().hex[:6]
        
        # ชื่อโฟลเดอร์ที่จะเก็บชุดไฟล์ที่หั่นแล้ว
        session_folder = f"set_{timestamp}_{unique_id}"
        
        # บันทึกไฟล์ต้นฉบับชั่วคราวเพื่อนำไปประมวลผล
        temp_input_path = os.path.join(UPLOAD_FOLDER, f"temp_{unique_id}.webm")
        file.save(temp_input_path)
        
        print(f"📥 ได้รับไฟล์ยาว... กำลังเริ่มหั่นเป็นส่วนละ 5 วินาที")
        
        # เรียกใช้ฟังก์ชันหั่นไฟล์
        num_chunks = chunk_audio(temp_input_path, session_folder)
        
        # ลบไฟล์ต้นฉบับทิ้ง (เพราะเราได้ไฟล์ย่อยๆ 5 วิ ในโฟลเดอร์แล้ว)
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
            
        if num_chunks == 0:
            return jsonify({'status': 'error', 'message': 'ไม่สามารถประมวลผลไฟล์ได้'}), 500
            
        print(f"✅ หั่นไฟล์สำเร็จ! ได้ทั้งหมด {num_chunks} ไฟล์ เก็บไว้ที่: {session_folder}")
            
        return jsonify({
            'status': 'success', 
            'message': f'บันทึก Dataset สำเร็จ แบ่งเป็น {num_chunks} ส่วน',
            'folder': session_folder
        }), 200 

if __name__ == '__main__':
    app.run(port=5000, debug=True)