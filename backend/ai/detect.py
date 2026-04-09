#!/usr/bin/env python3
"""
Guardian AI - Audio Detection Model
Processes WAV audio files and detects emergency keywords
"""

import json
import sys
import os
from pathlib import Path

# Try importing libraries - install if needed
try:
    import librosa
    import numpy as np
except ImportError:
    print("Warning: librosa not installed. Running in demo mode.")
    librosa = None

# Keyword patterns for different alert levels
KEYWORDS_DATABASE = {
    '4': ['help', 'ช่วย', 'ฉุกเฉิน', 'crisis', 'สัญญาณเตือน'],  # Critical
    '3': ['hurt', 'pain', 'ไม่สบาย', 'ปวด', 'ร้องขาดใจ'],  # High
    '2': ['medicine', 'needed', 'need', 'ต้องการ', 'ยา'],  # Medium
    '1': ['hello', 'call', 'ok', 'สวัสดี', 'โอเค']  # Low
}

CONFIDENCE_THRESHOLDS = {
    '4': 0.70,  # Critical: 70% confidence minimum
    '3': 0.60,  # High: 60% confidence minimum
    '2': 0.50,  # Medium: 50% confidence minimum
    '1': 0.40   # Low: 40% confidence minimum
}


def detect_audio(audio_path):
    """
    Process audio file and detect emergency keywords
    
    Args:
        audio_path (str): Path to WAV audio file
        
    Returns:
        dict: Detection result with is_alert, keyword, level, confidence
    """
    
    if not os.path.exists(audio_path):
        return {
            "success": False,
            "is_alert": 0,
            "transcribed_text": "",
            "keyword": "",
            "confidence": 0,
            "level": "none",
            "error": "Audio file not found"
        }
    
    try:
        result = {
            "success": True,
            "is_alert": 0,
            "transcribed_text": "Sample detection result",
            "keyword": "",
            "confidence": 0.0,
            "level": "none",
            "event_type": "voice_detection"
        }
        
        # Load audio file
        if librosa:
            try:
                audio_data, sr = librosa.load(audio_path, sr=16000)
                print(f"Audio loaded: {len(audio_data)} samples at {sr} Hz", file=sys.stderr)
            except Exception as e:
                print(f"Error loading audio: {e}", file=sys.stderr)
                return result
        else:
            # Demo mode - simulate audio processing
            print("Running in demo mode (librosa not installed)", file=sys.stderr)
        
        # Speech-to-Text simulation
        # In production, integrate: Google Cloud STT, Azure STT, or OpenAI Whisper
        transcribed_text = simulate_transcription(audio_path)
        result["transcribed_text"] = transcribed_text
        
        # Keyword detection
        detected_keyword, level, confidence = detect_keywords(transcribed_text)
        
        if detected_keyword:
            result["is_alert"] = 1
            result["keyword"] = detected_keyword
            result["level"] = level
            result["confidence"] = confidence
        else:
            result["level"] = "none"
            result["confidence"] = 0.0
        
        return result
        
    except Exception as e:
        print(f"Detection error: {e}", file=sys.stderr)
        return {
            "success": False,
            "is_alert": 0,
            "transcribed_text": "",
            "keyword": "",
            "confidence": 0,
            "level": "none",
            "error": str(e)
        }


def simulate_transcription(audio_path):
    """
    Simulate speech-to-text transcription
    Replace with actual STT API in production
    """
    
    # Demo keywords for testing
    demo_keywords = [
        "help I need assistance",
        "please call the doctor",
        "I'm in pain",
        "everything is okay",
        "สวัสดีครับ",
        "ช่วยด้วยครับ"
    ]
    
    # Use file hash to select demo result (for consistency)
    file_hash = hash(audio_path) % len(demo_keywords)
    return demo_keywords[file_hash]


def detect_keywords(text):
    """
    Detect keywords from transcribed text and determine alert level
    
    Args:
        text (str): Transcribed text from audio
        
    Returns:
        tuple: (keyword, level, confidence)
    """
    
    text_lower = text.lower()
    
    # Check each alert level (4=critical to 1=low)
    for level in ['4', '3', '2', '1']:
        keywords = KEYWORDS_DATABASE.get(level, [])
        threshold = CONFIDENCE_THRESHOLDS.get(level, 0.5)
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                # Calculate confidence based on keyword match
                confidence = min(0.95, threshold + 0.1)
                return keyword, level, confidence
    
    # No keyword detected
    return "", "none", 0.0


def validate_audio_file(filepath):
    """
    Validate audio file format and size
    
    Args:
        filepath (str): Path to audio file
        
    Returns:
        bool: True if valid
    """
    
    if not os.path.exists(filepath):
        return False
    
    if not filepath.lower().endswith(('.wav', '.mp3', '.ogg', '.flac')):
        return False
    
    file_size = os.path.getsize(filepath)
    max_size = 50 * 1024 * 1024  # 50MB
    
    if file_size > max_size:
        return False
    
    return True


def main():
    """
    Main entry point for CLI usage
    """
    
    if len(sys.argv) < 2:
        print("Usage: python detect.py <audio_file>")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    # Validate audio file
    if not validate_audio_file(audio_path):
        result = {
            "success": False,
            "is_alert": 0,
            "transcribed_text": "",
            "keyword": "",
            "confidence": 0,
            "level": "none",
            "error": "Invalid audio file"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Detect audio
    result = detect_audio(audio_path)
    
    # Output as JSON
    print(json.dumps(result))


if __name__ == "__main__":
    main()
