## คู่มือการติดตั้งและการใช้งาน (Installation Guide)

### สิ่งที่ต้องเตรียม (Prerequisites)
* **Python:** เวอร์ชัน 3.10 หรือ 3.11
* **Hardware:** แนะนำให้ใช้การ์ดจอ NVIDIA (เช่น RTX 3050 ขึ้นไป) เพื่อให้ AI ประมวลผลแบบ Real-time ได้ลื่นไหล
* **ไฟล์โมเดล:** ต้องมีโฟลเดอร์ `whisper-classifier-final` วางเตรียมไว้

---

### ขั้นตอนการติดตั้ง

**1. ติดตั้ง Library พื้นฐาน**
เปิด Terminal หรือ Command Prompt ในโฟลเดอร์โปรเจกต์ แล้วรันคำสั่ง:
```bash
pip install -r requirements.txt


**2.ติดตั้ง PyTorch สำหรับรันบนการ์ดจอ NVIDIA (GPU)**
เพื่อให้ AI ดึงพลังของ GPU มาใช้ทำงานได้อย่างเต็มที่และรวดเร็ว ให้รันคำสั่งนี้เพิ่มเติม:

Bash
pip install torch torchvision torchaudio --index-url [https://download.pytorch.org/whl/cu118](https://download.pytorch.org/whl/cu118)
3. การจัดวางโฟลเดอร์โมเดล
สร้างโฟลเดอร์ models --> [![Download](https://img.shields.io/badge/Google%20Drive-Open%20File-green?style=for-the-badge&logo=google-drive)](https://drive.google.com/file/d/1icb6BrxRqmFkjgtbKRovwOwfowtAuctP/view)
แล้วเอาโมเดล whisper-classifier-final ใส่ข้างใน

Plaintext
/PROJECT_KWS
├── app.py                     # โค้ด Backend (FastAPI)
├── index.html                  # โค้ด Frontend (Dashboard หน้าเว็บ)
├── requirements.txt            # ไฟล์รวมรายชื่อ Library
└── models   
      |── whisper-classifier-final   # โฟลเดอร์โมเดลจาก Kaggle
      ├── model.safetensors
      ├── config.json
      └── preprocessor_config.json

