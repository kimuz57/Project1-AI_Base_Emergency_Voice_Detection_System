import os
import io
import uuid

import numpy as np
import librosa
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

try:
    import speech_recognition as sr
    SR_AVAILABLE = True
except ImportError:
    SR_AVAILABLE = False
    print("⚠️ ไม่มี SpeechRecognition — รัน: pip install SpeechRecognition")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# 🔑 ระดับความเสี่ยง 4 ระดับ
# ==========================================

# ระดับ 4 — วิกฤต (0.90–1.00)
CRITICAL = {
    "ช่วยด้วย": 0.97, "ช่วยที": 0.95, "help me": 0.95,
    "emergency": 0.97, "หายใจไม่ออก": 0.97, "แน่นหน้าอก": 0.95,
    "ตาย": 0.95, "ตกเตียง": 0.92,
}

# ระดับ 3 — อันตราย (0.75–0.89)
DANGER = {
    "หกล้ม": 0.88, "ล้ม": 0.85, "เป็นลม": 0.88,
    "หมอ": 0.85, "พยาบาล": 0.85, "nurse": 0.85, "doctor": 0.85,
    "help": 0.85, "fall": 0.82, "pain": 0.80,
    "ช่วย": 0.78,
}

# ระดับ 2 — เฝ้าระวัง (0.50–0.74)
WARNING = {
    "เจ็บ": 0.72, "ปวด": 0.70, "เจ็บมาก": 0.74,
    "ปวดมาก": 0.73, "ไม่ดี": 0.55, "ไม่สบาย": 0.60,
    "วิงเวียน": 0.65, "คลื่นไส้": 0.62, "อ่อนแรง": 0.68,
    "แย่": 0.58, "แย่มาก": 0.68, "ไม่ได้": 0.52,
}

# ระดับ 1 — สังเกต (0.25–0.49)
OBSERVE = {
    "โอ๊ย": 0.45, "กุ๊ย": 0.40, "โอ้": 0.30,
    "อ๊ะ": 0.28, "เหนื่อย": 0.42, "เมื่อย": 0.35,
    "ร้อน": 0.30, "หนาว": 0.32, "กลัว": 0.40,
    "อยู่ไม่ได้": 0.48,
}

# รวมทุกระดับ (ตรวจตามลำดับจาก critical ลงมา)
ALL_KEYWORDS = [CRITICAL, DANGER, WARNING, OBSERVE]
LEVEL_NAMES = ["วิกฤต 🔴", "อันตราย 🟠", "เฝ้าระวัง 🟡", "สังเกต 🔵"]

# Threshold แต่ละระดับ
THRESHOLD_EMERGENCY = 0.75   # ขึ้นสีแดง (ระดับ 3–4)
THRESHOLD_WARNING = 0.50     # ขึ้นสีส้ม (ระดับ 2)
THRESHOLD_OBSERVE = 0.25     # ขึ้นสีเหลือง (ระดับ 1)

print("✅ ระบบ Speech-to-Text + Multi-level Risk Detection พร้อมใช้งาน!")

# ==========================================
# 🎤 แปลงเสียงเป็นข้อความ
# ==========================================
def speech_to_text(audio_path):
    if not SR_AVAILABLE:
        return ""
    try:
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.3)
            audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data, language="th-TH")
            print(f"🎤 ได้ยิน (TH): {text}")
            return text
        except sr.UnknownValueError:
            try:
                text = recognizer.recognize_google(audio_data, language="en-US")
                print(f"🎤 ได้ยิน (EN): {text}")
                return text
            except sr.UnknownValueError:
                print("🎤 ฟังไม่ออก")
                return ""
    except Exception as e:
        print(f"❌ Speech error: {e}")
        return ""

# ==========================================
# 🔍 ตรวจความเสี่ยงแบบ Multi-level
# ==========================================
def analyze_risk(text):
    text_lower = text.lower().strip()
    if not text_lower:
        return {"level": 0, "level_name": "ปกติ", "keyword": None, "confidence": 0.0}

    best = {"level": 0, "level_name": "ปกติ", "keyword": None, "confidence": 0.05}

    for i, keyword_dict in enumerate(ALL_KEYWORDS):
        for keyword, confidence in keyword_dict.items():
            if keyword in text_lower:
                if confidence > best["confidence"]:
                    best = {
                        "level": 4 - i,           # 4=วิกฤต, 3=อันตราย, 2=เฝ้าระวัง, 1=สังเกต
                        "level_name": LEVEL_NAMES[i],
                        "keyword": keyword,
                        "confidence": confidence
                    }

    # ถ้ามีคำพูดแต่ไม่เจอ keyword เลย — ให้ baseline ต่ำ
    if best["confidence"] == 0.05 and text_lower:
        best["confidence"] = 0.08

    print(f"📊 ระดับ: {best['level_name']} | keyword: {best['keyword']} | {best['confidence']:.2f}")
    return best

# ==========================================
# 🌐 Route หน้าเว็บ
# ==========================================
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# ==========================================
# 🚀 Route /predict
# ==========================================
@app.route('/predict', methods=['POST'])
def predict():
    if 'audio' not in request.files:
        return jsonify({'status': 'error', 'confidence': 0.0}), 400

    file = request.files['audio']
    tmp_path = os.path.join(UPLOAD_FOLDER, f"tmp_{uuid.uuid4().hex[:8]}.wav")

    try:
        file.save(tmp_path)

        # ตรวจระดับเสียง
        audio_data, _ = librosa.load(tmp_path, sr=16000, mono=True)
        rms = np.sqrt(np.mean(audio_data ** 2))
        db = 20 * np.log10(rms + 1e-9)
        print(f"🔊 ระดับเสียง: {db:.1f} dB")

        if db < -55.0:
            os.remove(tmp_path)
            return jsonify({'status': 'normal', 'confidence': 0.0,
                            'silent': True, 'text': '', 'level': 0,
                            'level_name': 'ปกติ', 'keyword': None}), 200

        # แปลงเสียงเป็นข้อความ
        text = speech_to_text(tmp_path)
        os.remove(tmp_path)

        # วิเคราะห์ความเสี่ยง
        risk = analyze_risk(text)

        # กำหนด status
        if risk["confidence"] >= THRESHOLD_EMERGENCY:
            status = "emergency"
        elif risk["confidence"] >= THRESHOLD_WARNING:
            status = "warning"
        elif risk["confidence"] >= THRESHOLD_OBSERVE:
            status = "observe"
        else:
            status = "normal"

        return jsonify({
            'status': status,
            'confidence': risk["confidence"],
            'silent': not bool(text),
            'text': text,
            'keyword': risk["keyword"],
            'level': risk["level"],
            'level_name': risk["level_name"]
        }), 200

    except Exception as e:
        print(f"❌ Error: {e}")
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return jsonify({'status': 'error', 'confidence': 0.0, 'silent': False}), 200

if __name__ == '__main__':
    print("🟢 Smart Ward Backend (Multi-level Risk) กำลังสตาร์ท...")
    app.run(host="0.0.0.0", port=5000, debug=True)