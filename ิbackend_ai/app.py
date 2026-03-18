import os
from datetime import datetime
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from pydub import AudioSegment
from pydub.silence import split_on_silence

# Import เพิ่มเติมสำหรับ AI
import librosa
import numpy as np
import joblib 

app = Flask(__name__)
# อนุญาตให้ Next.js ส่งข้อมูลเข้ามาได้
CORS(app) 

# สร้างโฟลเดอร์สำหรับเก็บไฟล์เสียงชั่วคราว
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# 🧠 1. โหลดสมอง AI เตรียมไว้ตั้งแต่เปิดเซิร์ฟเวอร์
# ==========================================
print("⏳ กำลังโหลดสมอง AI...")
try:
    # โหลดไฟล์ pkl (ต้องแน่ใจว่าไฟล์ voice_model.pkl อยู่โฟลเดอร์เดียวกับ app.py)
    ai_model = joblib.load('voice_model.pkl')
    print("✅ โหลดโมเดล AI สำเร็จพร้อมใช้งาน!")
except Exception as e:
    ai_model = None
    print(f"⚠️ หาไฟล์โมเดลไม่เจอ หรือโหลดไม่สำเร็จ: {e}")

# ==========================================
# 🧠 2. ฟังก์ชันสกัดจุดเด่นเสียง (ต้องเหมือนตอนสอนเป๊ะๆ)
# ==========================================
def get_audio_feature(file_path):
    try:
        audio, sample_rate = librosa.load(file_path, res_type='kaiser_fast')
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
        mfccs_scaled = np.mean(mfccs.T, axis=0)
        # ปรับรูปร่างข้อมูลให้เป็นแบบที่โมเดล Random Forest ต้องการ (1 แถว)
        return mfccs_scaled.reshape(1, -1) 
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการสกัด MFCC: {e}")
        return None

# ==========================================
# ✂️ ฟังก์ชันตัดเสียงเงียบ
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
# 🚀 API รับไฟล์เสียงจากหน้าเว็บ
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
        
        input_filename = f"record_{timestamp}_{random_id}.webm"
        output_filename = f"clean_{timestamp}_{random_id}.wav"
        
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        # 1. เซฟไฟล์ต้นฉบับ
        file.save(input_path)
        print(f"📥 เซฟไฟล์ใหม่ชื่อ: {input_filename}")
        
        # 2. นำไปตัดเสียงเงียบ
        has_voice = extract_voice_only(input_path, output_path)
        
        # ลบไฟล์ webm ต้นฉบับทิ้งเพื่อประหยัดพื้นที่
        if os.path.exists(input_path):
            os.remove(input_path) 
            
        if not has_voice:
            return jsonify({'status': 'normal', 'message': 'ไม่พบเสียงพูดในคลิป'}), 200
        
        print(f"✅ ตัดเสียงเงียบสำเร็จ! กำลังส่งให้ AI วิเคราะห์...")
        
        # 🧠 3. ส่งให้ AI วิเคราะห์ของจริง! 🧠
        final_result = "normal" # ตั้งค่าเริ่มต้นไว้ก่อน
        
        if ai_model is not None:
            features = get_audio_feature(output_path)
            if features is not None:
                # สั่งให้โมเดลทำนาย (0 = ปกติ, 1 = ขอความช่วยเหลือ ตามที่เราสอนไว้)
                prediction = ai_model.predict(features)
                
                if prediction[0] == 1:
                    final_result = "help"
                else:
                    final_result = "normal"
                    
                print(f"🤖 ผลการวิเคราะห์จาก AI: {final_result.upper()} (รหัส: {prediction[0]})")
            else:
                print("❌ ไม่สามารถสกัดข้อมูลเสียงได้")
        else:
            print("⚠️ ไม่มีโมเดล AI ทำงานอยู่")
        
        # ผมคอมเมนต์การลบไฟล์ wav ทิ้งไว้ เพื่อให้คุณเข้าไปฟังเสียงที่ถูกตัดได้ครับ
        # ถ้าอยากให้ระบบลบอัตโนมัติ ให้เอา # ออกได้เลยครับ
        # if os.path.exists(output_path):
        #     os.remove(output_path)
        
        return jsonify({'status': final_result, 'message': 'วิเคราะห์สำเร็จ'}), 200  
if __name__ == '__main__':
    app.run(port=5000, debug=True)