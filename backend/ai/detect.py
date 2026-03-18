#!/usr/bin/env python3
# ============================================
# Guardian AI — Voice Detection Script
# ============================================
# Usage: python detect.py <audio_file.wav>
# Output: JSON with detection results
# ============================================

import sys
import json
import os

# ──────────────────────────────────
# Thai emergency keywords
# ──────────────────────────────────
EMERGENCY_KEYWORDS = [
    "ช่วยด้วย",
    "ช่วยที",
    "ช่วย",
    "เจ็บ",
    "ปวด",
    "ล้ม",
    "หกล้ม",
    "ตกเตียง",
    "หายใจไม่ออก",
    "แน่นหน้าอก",
    "เป็นลม",
    "วิงเวียน",
    "ไม่สบาย",
    "ตาย",
    "โอ๊ย",
    "อุ๊ย",
    "help",
    "help me",
    "emergency",
    "pain",
    "fall",
]

# Confidence weights for different keywords
KEYWORD_WEIGHTS = {
    "ช่วยด้วย": 0.95,
    "ช่วยที": 0.90,
    "help me": 0.90,
    "help": 0.85,
    "emergency": 0.95,
    "หายใจไม่ออก": 0.95,
    "แน่นหน้าอก": 0.95,
    "ตกเตียง": 0.90,
    "หกล้ม": 0.88,
    "เจ็บ": 0.80,
    "ปวด": 0.78,
    "ล้ม": 0.85,
    "เป็นลม": 0.88,
    "ไม่สบาย": 0.70,
    "โอ๊ย": 0.65,
    "อุ๊ย": 0.60,
}


def detect_keywords(text):
    """Check if text contains emergency keywords"""
    text_lower = text.lower().strip()

    for keyword in EMERGENCY_KEYWORDS:
        if keyword in text_lower:
            confidence = KEYWORD_WEIGHTS.get(keyword, 0.75)
            return {
                "is_alert": True,
                "keyword_detected": keyword,
                "confidence": confidence,
            }

    return {
        "is_alert": False,
        "keyword_detected": None,
        "confidence": 0.0,
    }


def speech_to_text(audio_path):
    """Convert audio file to text using SpeechRecognition"""
    try:
        import speech_recognition as sr

        recognizer = sr.Recognizer()

        with sr.AudioFile(audio_path) as source:
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio_data = recognizer.record(source)

        # Try Thai first, then English
        text = ""
        try:
            text = recognizer.recognize_google(audio_data, language="th-TH")
        except sr.UnknownValueError:
            try:
                text = recognizer.recognize_google(audio_data, language="en-US")
            except sr.UnknownValueError:
                text = ""
        except sr.RequestError as e:
            print(f"Google Speech API error: {e}", file=sys.stderr)
            text = ""

        return text

    except ImportError:
        print("SpeechRecognition not installed. Run: pip install SpeechRecognition", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"Speech-to-text error: {e}", file=sys.stderr)
        return ""


def main():
    if len(sys.argv) < 2:
        result = {
            "transcribed_text": "",
            "keyword_detected": None,
            "is_alert": False,
            "confidence": 0.0,
            "error": "No audio file provided",
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)

    audio_path = sys.argv[1]

    # Check if file exists
    if not os.path.exists(audio_path):
        result = {
            "transcribed_text": "",
            "keyword_detected": None,
            "is_alert": False,
            "confidence": 0.0,
            "error": f"File not found: {audio_path}",
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)

    # Step 1: Speech-to-text
    transcribed_text = speech_to_text(audio_path)

    # Step 2: Keyword detection
    detection = detect_keywords(transcribed_text)

    # Build result
    result = {
        "transcribed_text": transcribed_text,
        "keyword_detected": detection["keyword_detected"],
        "is_alert": detection["is_alert"],
        "confidence": detection["confidence"],
    }

    # Output JSON to stdout
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
