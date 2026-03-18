import os
import librosa
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# 1. ฟังก์ชันแปลงคลื่นเสียงให้เป็นตัวเลข (MFCC)
def extract_features(file_path):
    try:
        # โหลดไฟล์เสียง
        audio, sample_rate = librosa.load(file_path, res_type='kaiser_fast') 
        # สกัดค่า MFCC (ดึงมา 40 จุดเด่น)
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
        # หาค่าเฉลี่ยเพื่อให้ข้อมูลเป็นแถวเดียว
        mfccs_scaled = np.mean(mfccs.T, axis=0)
        return mfccs_scaled
    except Exception as e:
        print(f"อ่านไฟล์ไม่ได้: {file_path} - {e}")
        return None

# 2. ฟังก์ชันกวาดไฟล์ในโฟลเดอร์มาสอน
def load_data():
    features = []
    labels = []
    
    # 0 = เสียงปกติ
    if os.path.exists("dataset/normal"):
        for file in os.listdir("dataset/normal"):
            if file.endswith(".wav"):
                data = extract_features(f"dataset/normal/{file}")
                if data is not None:
                    features.append(data)
                    labels.append(0)
                
    # 1 = เสียงขอความช่วยเหลือ
    if os.path.exists("dataset/help"):
        for file in os.listdir("dataset/help"):
            if file.endswith(".wav"):
                data = extract_features(f"dataset/help/{file}")
                if data is not None:
                    features.append(data)
                    labels.append(1)
                
    return np.array(features), np.array(labels)

print("⏳ กำลังโหลดและสกัดจุดเด่นของเสียง (รอสักครู่)...")
X, y = load_data()

if len(X) == 0:
    print("❌ ไม่พบไฟล์เสียงในโฟลเดอร์ dataset เลยครับ!")
else:
    # 3. แบ่งข้อมูล (สอน 80% / สอบ 20%)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. สร้างและสอนโมเดลสมอง (Random Forest)
    print("🧠 กำลังสอน AI...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 5. ตรวจสอบความฉลาด
    x = [5, 10, 15] 
    x.mean() # ตัวอย่างข้อมูลใหม่ (ต้องสกัด MFCC มาให้เหมือนตอนสอน)
    
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"🎯 ความแม่นยำของโมเดล: {accuracy * 100:.2f}%")

    # 6. เซฟสมอง AI เก็บไว้ใช้งาน
    joblib.dump(model, 'voice_model.pkl')
    print("✅ สร้างไฟล์สมองสำเร็จ! (voice_model.pkl)")