import os
import torch
import pandas as pd
from datasets import Dataset, Audio
from transformers import (
    AutoFeatureExtractor,
    AutoConfig,
    AutoModelForAudioClassification,
    TrainingArguments,
    Trainer
)

# 🚨 ป้องกันบั๊ก GPU ตีกัน
os.environ["CUDA_VISIBLE_DEVICES"] = "0,1"
torch.cuda.empty_cache()

# =====================================
# 1. ตั้งค่า
# =====================================
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using:", device)

# ✅ กำหนดโมเดลต้นแบบ
model_id = "openai/whisper-medium"

config = AutoConfig.from_pretrained(model_id)
config.num_labels = 2   # 🔥 บังคับให้โลกนี้มีแค่ 2 คำตอบ (0 กับ 1)

model = AutoModelForAudioClassification.from_pretrained(
    model_id,
    config=config,
    ignore_mismatched_sizes=True   # 🔥 ทิ้งสมองส่วนพูด เอาแค่ส่วนฟัง
).to(device)

# =====================================
# 2. โหลดข้อมูล (ป้องกันไฟล์ Test หลุดเข้ามา)
# =====================================
data = []

for root, dirs, files in os.walk('/kaggle/input'):
    if "test" in root.lower(): continue # ✅ ข้ามโฟลเดอร์ข้อสอบ

    for file in files:
        if file.lower().endswith((".wav", ".mp3", ".flac", ".ogg")):
            path = os.path.join(root, file)
            if "test" in path.lower(): continue 

            # จับ Keyword จากชื่อโฟลเดอร์/ไฟล์
            if "pos" in path.lower(): 
                label = 1   # 🔥 ฉุกเฉิน
            else:
                label = 0   # 🔥 ปกติ

            data.append({
                "path": path,
                "label": label
            })

df = pd.DataFrame(data)

# ✅ สลับข้อมูล (Shuffle) ป้องกัน AI จับทางได้
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"จำนวนไฟล์พร้อมเทรน: {len(df)}")

if len(df) == 0:
    raise ValueError("❌ ไม่มีข้อมูล")

# =====================================
# 3. แปลงเป็น Dataset
# =====================================
dataset = Dataset.from_pandas(df)
dataset = dataset.cast_column("path", Audio(sampling_rate=16000))
feature_extractor = AutoFeatureExtractor.from_pretrained(model_id)

# =====================================
# 4. Preprocess เสียง
# =====================================
def preprocess(batch):
    audio = batch["path"]

    # 🔥 ตัดเสียงเหลือ 8 วินาที
    audio_array = audio["array"][:16000 * 8]

    inputs = feature_extractor(
        audio_array,
        sampling_rate=16000,
        return_tensors="pt"
    )

    # 🚨 แก้บั๊กตรงนี้! Whisper ต้องใช้ input_features
    batch["input_features"] = inputs.input_features[0]
    batch["labels"] = batch["label"]

    return batch

print("⏳ กำลังสกัดฟีเจอร์เสียง...")
dataset = dataset.map(preprocess, remove_columns=dataset.column_names)

# =====================================
# 5. Training args
# =====================================
training_args = TrainingArguments(
    output_dir="/kaggle/working/audio-classifier",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    num_train_epochs=5,      # 💡 5 รอบก็หรูแล้วสำหรับการทำ Classification
    learning_rate=3e-5,
    warmup_steps=20,         
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
    save_total_limit=2,      # ✅ ป้องกันฮาร์ดดิสก์ Kaggle เต็ม
    report_to="none"
)

# =====================================
# 6. Trainer
# =====================================
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
)

print("🚀 เริ่มปั่นโมเดล Audio Classification...")
trainer.train()

# =====================================
# 7. Save
# =====================================
save_path = "/kaggle/working/whisper-classifier-final"
trainer.save_model(save_path)
feature_extractor.save_pretrained(save_path)

print(f"✅ เสร็จสิ้น! โมเดลเซฟไว้ที่: {save_path}")