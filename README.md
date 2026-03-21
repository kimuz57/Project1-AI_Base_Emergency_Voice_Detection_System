## 🚀 PROJECT_KWS - Keyword Spotting AI

<p align="center">
  <a href="https://drive.google.com/file/d/1icb6BrxRqmFkjgtbKRovwOwfowtAuctP/view">
    <img src="https://img.shields.io/badge/📥_Download_Model-Google_Drive-green?style=for-the-badge&logo=google-drive">
  </a>
</p>

---

## 📦 Installation Guide

### 🧰 Prerequisites

* Python **3.10 / 3.11**
* NVIDIA GPU (แนะนำ RTX 3050+)
* โมเดล `whisper-classifier-final`

---

### ⚙️ Installation

#### 1️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

#### 2️⃣ Install PyTorch (GPU)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### 3️⃣ Setup Model

* สร้างโฟลเดอร์ `models`
* ดาวน์โหลดโมเดลจากปุ่มด้านบน
* นำ `whisper-classifier-final` ไปใส่ในโฟลเดอร์

---

## ▶️ Usage

```bash
python app.py
```

เปิดเว็บที่:

```
http://localhost:8000
```

---

## 📁 Project Structure

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

---

## ⚡ Features

* 🎤 Real-time Keyword Spotting
* ⚡ FastAPI Backend
* 🌐 Web Dashboard
* 🚀 GPU Acceleration (PyTorch)

---

## 🧠 Tech Stack

* Python
* FastAPI
* PyTorch
* Transformers

---

## 👨‍💻 Author

Developed by **Krit**

---
