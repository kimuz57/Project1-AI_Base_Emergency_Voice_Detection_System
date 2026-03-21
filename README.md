## 🚀 PROJECT_KWS - Keyword Spotting AI

### ⚙️ Installation

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Install PyTorch (GPU)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### Setup Model

* สร้างโฟลเดอร์ `models`
* ดาวน์โหลดโมเดล
<p align="center">
  <a href="https://drive.google.com/file/d/1icb6BrxRqmFkjgtbKRovwOwfowtAuctP/view">
    <img src="https://img.shields.io/badge/📥_Download_Model-Google_Drive-green?style=for-the-badge&logo=google-drive">
  </a>
</p>
* นำ `whisper-classifier-final` ไปใส่ในโฟลเดอร์

---

##Usage

```bash
python app.py
```

เปิดเว็บที่:

```
http://localhost:3000
```

---

##Project Structure

```plaintext
/PROJECT_KWS
├── app.py
├── index.html
├── requirements.txt
└── models
    └── whisper-classifier-final
        ├── model.safetensors
        ├── config.json
        └── preprocessor_config.json
```
