-- ============================================
-- Guardian AI — Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS guardian_ai
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE guardian_ai;

-- ============================================
-- 1. Users (auth + role)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'caregiver', 'patient') NOT NULL DEFAULT 'caregiver',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 2. Devices (ESP32 nodes)
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  status ENUM('online', 'offline', 'warning') NOT NULL DEFAULT 'offline',
  signal_strength VARCHAR(20) DEFAULT NULL,
  temperature VARCHAR(20) DEFAULT NULL,
  warning_message VARCHAR(255) DEFAULT NULL,
  last_seen TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 3. Patients
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  room VARCHAR(50) DEFAULT NULL,
  device_id INT DEFAULT NULL,
  caregiver_id INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 4. Event Sound (main event table)
-- ============================================
CREATE TABLE IF NOT EXISTS event_sound (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT DEFAULT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'เสียง',
  audio_url VARCHAR(500) DEFAULT NULL,
  transcribed_text TEXT DEFAULT NULL,
  keyword_detected VARCHAR(100) DEFAULT NULL,
  is_alert TINYINT(1) NOT NULL DEFAULT 0,
  confidence DECIMAL(5,4) DEFAULT 0.0000,
  zone VARCHAR(100) DEFAULT NULL,
  description VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 5. Alert Log
-- ============================================
CREATE TABLE IF NOT EXISTS alert_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  notified_via VARCHAR(50) NOT NULL DEFAULT 'LINE',
  message TEXT DEFAULT NULL,
  notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES event_sound(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- Seed Data: default admin user
-- password = "admin123" (bcrypt hash)
-- ============================================
INSERT INTO users (name, email, password_hash, role) VALUES
  ('ผู้ดูแลระบบ', 'admin@guardian.ai', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE name = name;

-- ============================================
-- Seed Data: sample devices
-- ============================================
INSERT INTO devices (name, code, status, signal_strength, temperature) VALUES
  ('Node_ESP_A01', 'A01', 'online', '-45 dBm', '24.5°C'),
  ('Node_ESP_B04', 'B04', 'offline', NULL, NULL),
  ('Node_ESP_C12', 'C12', 'warning', NULL, '42.8°C'),
  ('Node_ESP_A05', 'A05', 'online', '-38 dBm', '22.1°C'),
  ('Node_ESP_A09', 'A09', 'online', '-51 dBm', '23.8°C')
ON DUPLICATE KEY UPDATE name = name;
