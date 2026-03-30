#!/usr/bin/env python3
"""
Guardian AI — Sound Detection (detect.py)
─────────────────────────────────────────────────────────────────
รับ: python detect.py <path_to_wav_file>
ส่งออก: JSON ทาง stdout

{
  "keyword": "scream",
  "confidence": 0.87,
  "is_alert": true,
  "rms_db": -18.5,
  "duration": 2.0,
  "details": { ... }
}

Algorithm (Rule-based + ลักษณะเสียง):
  1. คำนวณ RMS (loudness)
  2. คำนวณ Zero Crossing Rate (ZCR)
  3. คำนวณ Spectral Centroid
  4. ตัดสินใจจาก rules
"""

import sys
import json
import wave
import struct
import math
import os

# ─── Optional: ใช้ numpy ถ้ามี (เร็วกว่า) ──────────────────────
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# ─── Optional: ใช้ librosa ถ้ามี (feature extraction ดีกว่า) ───
try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False


def load_wav(wav_path: str):
    """โหลด WAV file และคืน (samples, sample_rate, duration)"""
    with wave.open(wav_path, 'rb') as wf:
        channels      = wf.getnchannels()
        sample_width  = wf.getsampwidth()   # bytes per sample
        sample_rate   = wf.getframerate()
        n_frames      = wf.getnframes()
        duration      = n_frames / sample_rate

        raw_data = wf.readframes(n_frames)

    # แปลงเป็น list ของ float samples [-1.0, 1.0]
    if sample_width == 2:
        fmt = f'<{len(raw_data) // 2}h'
        raw_samples = list(struct.unpack(fmt, raw_data))
        samples = [s / 32768.0 for s in raw_samples]
    elif sample_width == 4:
        fmt = f'<{len(raw_data) // 4}i'
        raw_samples = list(struct.unpack(fmt, raw_data))
        samples = [s / 2147483648.0 for s in raw_samples]
    else:
        samples = [0.0]

    # Mono: ถ้า stereo ให้เฉลี่ย channels
    if channels == 2:
        samples = [(samples[i] + samples[i+1]) / 2 for i in range(0, len(samples)-1, 2)]

    return samples, sample_rate, duration


def compute_rms(samples):
    """คำนวณ RMS — ความดัง"""
    if not samples:
        return 0.0
    if HAS_NUMPY:
        arr = np.array(samples)
        return float(np.sqrt(np.mean(arr ** 2)))
    else:
        sq_sum = sum(s * s for s in samples)
        return math.sqrt(sq_sum / len(samples))


def rms_to_db(rms):
    """แปลง RMS เป็น dB"""
    if rms <= 0:
        return -96.0
    return 20 * math.log10(rms)


def compute_zcr(samples):
    """Zero Crossing Rate — อัตราการตัดผ่านศูนย์ (บอกความสูงของเสียง)"""
    if len(samples) < 2:
        return 0.0
    crossings = sum(1 for i in range(1, len(samples))
                    if (samples[i] >= 0) != (samples[i-1] >= 0))
    return crossings / len(samples)


def compute_spectral_features(samples, sample_rate):
    """
    คำนวณ spectral features อย่างง่าย (ไม่ใช้ librosa)
    คืน: (low_energy, mid_energy, high_energy)
    """
    n = len(samples)
    if n < 64:
        return 0.0, 0.0, 0.0

    # แบ่ง samples เป็น 3 ช่วงเวลา แล้วดู RMS แต่ละช่วง
    third = n // 3
    lo_rms  = compute_rms(samples[:third])
    mid_rms = compute_rms(samples[third:2*third])
    hi_rms  = compute_rms(samples[2*third:])

    return lo_rms, mid_rms, hi_rms


def compute_peak_amplitude(samples):
    """Peak amplitude"""
    if not samples:
        return 0.0
    return max(abs(s) for s in samples)


def classify_sound(rms, rms_db, zcr, lo, mid, hi, peak, duration):
    """
    Rule-based sound classification
    คืน: (keyword, confidence, is_alert)
    """

    # ─── เสียงเงียบมาก ────────────────────────────────────────
    if rms_db < -45:
        return 'silence', 0.95, False

    # ─── เสียงปกติ (พื้นหลัง) ────────────────────────────────
    if rms_db < -30 and zcr < 0.08:
        return 'normal', 0.80, False

    # ─── เสียงกรีดร้อง ────────────────────────────────────────
    # ลักษณะ: ดังมาก, ZCR สูง, peak สูง
    if rms_db > -20 and zcr > 0.15 and peak > 0.6:
        conf = min(0.95, 0.65 + (rms_db + 20) / 40 + zcr * 0.5)
        return 'scream', round(conf, 2), True

    # ─── เสียงแตกหัก / กระทบ ──────────────────────────────────
    # ลักษณะ: peak สูงกะทันหัน, แต่ RMS เฉลี่ยไม่สูงนัก
    if peak > 0.8 and rms_db < -15 and hi > lo * 1.5:
        conf = min(0.90, 0.60 + peak * 0.3)
        return 'breaking', round(conf, 2), True

    # ─── เสียงสัญญาณเตือน (repetitive) ───────────────────────
    # ลักษณะ: RMS สม่ำเสมอ, ZCR กลาง
    if rms_db > -25 and 0.05 < zcr < 0.15:
        variance = abs(lo - hi) / (mid + 0.001)
        if variance < 0.3:
            return 'alarm', 0.72, True

    # ─── เสียงร้องไห้ ─────────────────────────────────────────
    # ลักษณะ: ดังปานกลาง, ZCR ต่ำ-กลาง, ต่อเนื่อง
    if -30 < rms_db < -15 and 0.04 < zcr < 0.12:
        return 'crying', 0.65, False

    # ─── เสียงดังผิดปกติ (ไม่ระบุประเภท) ────────────────────
    if rms_db > -20:
        conf = min(0.80, 0.55 + (rms_db + 20) / 50)
        return 'loud_noise', round(conf, 2), True

    # ─── ปกติ ─────────────────────────────────────────────────
    return 'normal', 0.70, False


def analyze_wav(wav_path: str) -> dict:
    """วิเคราะห์ไฟล์ WAV และคืนผลลัพธ์"""

    if not os.path.exists(wav_path):
        return {
            'keyword': 'error',
            'confidence': 0.0,
            'is_alert': False,
            'error': f'File not found: {wav_path}',
        }

    try:
        # ─── ถ้ามี librosa ใช้ได้เลย (ดีกว่า) ──────────────
        if HAS_LIBROSA:
            return analyze_with_librosa(wav_path)

        # ─── Fallback: rule-based เอง ────────────────────────
        samples, sample_rate, duration = load_wav(wav_path)

        rms   = compute_rms(samples)
        db    = rms_to_db(rms)
        zcr   = compute_zcr(samples)
        peak  = compute_peak_amplitude(samples)
        lo, mid, hi = compute_spectral_features(samples, sample_rate)

        keyword, confidence, is_alert = classify_sound(rms, db, zcr, lo, mid, hi, peak, duration)

        return {
            'keyword':    keyword,
            'confidence': confidence,
            'is_alert':   is_alert,
            'rms_db':     round(db, 2),
            'duration':   round(duration, 2),
            'details': {
                'rms':       round(rms, 4),
                'zcr':       round(zcr, 4),
                'peak':      round(peak, 4),
                'lo_rms':    round(lo, 4),
                'mid_rms':   round(mid, 4),
                'hi_rms':    round(hi, 4),
                'has_numpy': HAS_NUMPY,
                'engine':    'rule_based',
            }
        }

    except Exception as e:
        return {
            'keyword':    'error',
            'confidence': 0.0,
            'is_alert':   False,
            'error':      str(e),
        }


def analyze_with_librosa(wav_path: str) -> dict:
    """วิเคราะห์โดยใช้ librosa (ถ้าติดตั้งแล้ว)"""
    y, sr = librosa.load(wav_path, sr=16000, mono=True)
    duration = len(y) / sr

    # Features
    rms          = float(librosa.feature.rms(y=y).mean())
    db           = rms_to_db(rms)
    zcr          = float(librosa.feature.zero_crossing_rate(y).mean())
    spec_centroid= float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())
    spec_rolloff = float(librosa.feature.spectral_rolloff(y=y, sr=sr).mean())
    peak         = float(np.max(np.abs(y)))
    lo, mid, hi  = compute_spectral_features(y.tolist(), sr)

    keyword, confidence, is_alert = classify_sound(rms, db, zcr, lo, mid, hi, peak, duration)

    return {
        'keyword':    keyword,
        'confidence': confidence,
        'is_alert':   is_alert,
        'rms_db':     round(db, 2),
        'duration':   round(duration, 2),
        'details': {
            'rms':              round(rms, 4),
            'zcr':              round(zcr, 4),
            'peak':             round(peak, 4),
            'spectral_centroid': round(spec_centroid, 2),
            'spectral_rolloff':  round(spec_rolloff, 2),
            'engine':           'librosa',
        }
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'keyword': 'error',
            'confidence': 0.0,
            'is_alert': False,
            'error': 'Usage: python detect.py <wav_file>',
        }))
        sys.exit(1)

    wav_file = sys.argv[1]
    result   = analyze_wav(wav_file)

    # ส่งผลลัพธ์เป็น JSON (Node.js อ่านจาก stdout)
    print(json.dumps(result))
