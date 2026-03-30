/**
 * Guardian AI — SQLite Database Helper
 * จัดการ database สำหรับบันทึก audio events
 */

const { DatabaseSync } = require('node:sqlite');
const fs       = require('fs');
const path     = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './guardian.db';

let db = null;

function getDb() {
    if (!db) {
        db = new DatabaseSync(DB_PATH);
        db.exec('PRAGMA journal_mode = WAL;');  // ดีกว่า default สำหรับ concurrent
        db.exec('PRAGMA synchronous = NORMAL;');
        initSchema();
    }
    return db;
}

function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            device_code      TEXT NOT NULL,
            event_sound      TEXT,
            audio_url        TEXT,
            keyword_detected TEXT,
            confidence       REAL DEFAULT 0.0,
            is_alert         INTEGER DEFAULT 0,
            raw_result       TEXT,
            created_at       DATETIME DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_events_device   ON events(device_code);
        CREATE INDEX IF NOT EXISTS idx_events_alert    ON events(is_alert);
        CREATE INDEX IF NOT EXISTS idx_events_created  ON events(created_at);

        CREATE TABLE IF NOT EXISTS devices (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            device_code TEXT UNIQUE NOT NULL,
            device_name TEXT,
            room        TEXT,
            active      INTEGER DEFAULT 1,
            created_at  DATETIME DEFAULT (datetime('now', 'localtime'))
        );

        -- seed device A01 ถ้าไม่มี
        INSERT OR IGNORE INTO devices (device_code, device_name, room)
        VALUES ('A01', 'Guardian Mic A01', 'ห้องหลัก');
    `);

    console.log('✅ Database initialized:', DB_PATH);
}

/**
 * บันทึก audio event ลง DB
 */
function insertEvent({ deviceCode, eventSound, audioUrl, keywordDetected, confidence, isAlert, rawResult }) {
    const stmt = getDb().prepare(`
        INSERT INTO events
            (device_code, event_sound, audio_url, keyword_detected, confidence, is_alert, raw_result)
        VALUES
            (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        deviceCode,
        eventSound || null,
        audioUrl || null,
        keywordDetected || null,
        confidence || 0.0,
        isAlert ? 1 : 0,
        rawResult ? JSON.stringify(rawResult) : null
    );

    return Number(result.lastInsertRowid);
}

/**
 * ดึง events ล่าสุด
 */
function getRecentEvents(limit = 50) {
    return getDb().prepare(`
        SELECT e.*, d.device_name, d.room
        FROM events e
        LEFT JOIN devices d ON e.device_code = d.device_code
        ORDER BY e.created_at DESC
        LIMIT ?
    `).all(limit);
}

/**
 * ดึงเฉพาะ alert events
 */
function getAlertEvents(limit = 20) {
    return getDb().prepare(`
        SELECT e.*, d.device_name, d.room
        FROM events e
        LEFT JOIN devices d ON e.device_code = d.device_code
        WHERE e.is_alert = 1
        ORDER BY e.created_at DESC
        LIMIT ?
    `).all(limit);
}

/**
 * สถิติรวม
 */
function getStats() {
    const db = getDb();
    return {
        total:      db.prepare('SELECT COUNT(*) as c FROM events').get().c,
        alerts:     db.prepare('SELECT COUNT(*) as c FROM events WHERE is_alert = 1').get().c,
        today:      db.prepare("SELECT COUNT(*) as c FROM events WHERE date(created_at) = date('now', 'localtime')").get().c,
        devices:    db.prepare('SELECT COUNT(*) as c FROM devices WHERE active = 1').get().c,
    };
}

module.exports = { getDb, insertEvent, getRecentEvents, getAlertEvents, getStats };
