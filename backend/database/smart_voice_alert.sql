-- =========================================
-- Guardian AI Smart Voice Alert System
-- Database Schema
-- =========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS smart_voice_alert;
USE smart_voice_alert;

-- =========================================
-- 1. Users Table
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'caregiver', 'patient') NOT NULL DEFAULT 'caregiver',
    license_no VARCHAR(50),
    department VARCHAR(100),
    status ENUM('active', 'inactive', 'disabled') NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 2. Patient Profile Table
-- =========================================
CREATE TABLE IF NOT EXISTS patient_profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    patient_code VARCHAR(50) UNIQUE,
    id_card VARCHAR(13),
    gender ENUM('male', 'female', 'other') DEFAULT NULL,
    birth_date DATE,
    blood_group VARCHAR(10),
    weight DECIMAL(5, 2),
    height DECIMAL(5, 2),
    illness TEXT,
    allergy TEXT,
    disease_history TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_patient_code (patient_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 3. Diseases Table
-- =========================================
CREATE TABLE IF NOT EXISTS diseases (
    diseases_id INT AUTO_INCREMENT PRIMARY KEY,
    diseases_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    INDEX idx_disease_name (diseases_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 4. Patient Diseases (Many-to-Many)
-- =========================================
CREATE TABLE IF NOT EXISTS patient_diseases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    diseases_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patient_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (diseases_id) REFERENCES diseases(diseases_id) ON DELETE CASCADE,
    UNIQUE KEY unique_patient_disease (patient_id, diseases_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_disease_id (diseases_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 5. Device Table (ESP32)
-- =========================================
CREATE TABLE IF NOT EXISTS device (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_status ENUM('online', 'offline', 'error', 'maintenance') NOT NULL DEFAULT 'offline',
    patient_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patient_profile(id) ON DELETE SET NULL,
    INDEX idx_device_code (device_code),
    INDEX idx_patient_id (patient_id),
    INDEX idx_device_status (device_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 6. Event Sound Table
-- =========================================
CREATE TABLE IF NOT EXISTS event_sound (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    patient_id INT,
    event_type VARCHAR(50),
    transcribed_text TEXT,
    keyword_detected VARCHAR(255),
    audio_url VARCHAR(255),
    is_alert TINYINT(1) DEFAULT 0,
    confidence DECIMAL(3, 2),
    alert_level ENUM('1', '2', '3', '4', 'none') DEFAULT 'none',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES device(device_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patient_profile(id) ON DELETE SET NULL,
    INDEX idx_device_id (device_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_is_alert (is_alert),
    INDEX idx_created_at (created_at),
    INDEX idx_alert_level (alert_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 7. Alert Log Table
-- =========================================
CREATE TABLE IF NOT EXISTS alert_log (
    alert_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    alert_level INT DEFAULT 1,
    message TEXT,
    status ENUM('sent', 'failed', 'acknowledged') DEFAULT 'sent',
    sent_to VARCHAR(255),
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at DATETIME,
    FOREIGN KEY (event_id) REFERENCES event_sound(event_id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- 8. User Management (Caregiver-Patient Relationship)
-- =========================================
CREATE TABLE IF NOT EXISTS user_management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caregiver_user_id INT NOT NULL,
    patient_user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_caregiver_patient (caregiver_user_id, patient_user_id),
    INDEX idx_caregiver_id (caregiver_user_id),
    INDEX idx_patient_user_id (patient_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================
-- Insert Sample Diseases
-- =========================================
INSERT INTO diseases (diseases_name, description) VALUES
('Hypertension', 'High blood pressure condition'),
('Diabetes Type 2', 'Blood sugar regulation disorder'),
('Heart Disease', 'Cardiovascular disease'),
('Asthma', 'Respiratory airway disorder'),
('Alzheimer', 'Cognitive decline disease'),
('Parkinson', 'Degenerative neurological disorder');

-- =========================================
-- Create Views for Common Queries
-- =========================================

-- View: Patient Summary with Latest Device Status
CREATE OR REPLACE VIEW v_patient_summary AS
SELECT 
    p.id,
    p.patient_code,
    u.first_name,
    u.last_name,
    u.phone_number,
    u.email,
    d.device_code,
    d.device_status,
    COUNT(DISTINCT e.event_id) as total_events,
    SUM(e.is_alert) as alert_count,
    MAX(e.created_at) as last_event_time
FROM patient_profile p
JOIN users u ON p.user_id = u.id
LEFT JOIN device d ON p.id = d.patient_id
LEFT JOIN event_sound e ON d.device_id = e.device_id
GROUP BY p.id, d.device_id;

-- View: Alert Summary
CREATE OR REPLACE VIEW v_alert_summary AS
SELECT 
    e.event_id,
    p.patient_code,
    u.first_name,
    u.last_name,
    d.device_name,
    e.keyword_detected,
    e.alert_level,
    e.confidence,
    e.created_at,
    al.status as alert_status
FROM event_sound e
JOIN device d ON e.device_id = d.device_id
JOIN patient_profile p ON d.patient_id = p.id
JOIN users u ON p.user_id = u.id
LEFT JOIN alert_log al ON e.event_id = al.event_id
WHERE e.is_alert = 1
ORDER BY e.created_at DESC;
