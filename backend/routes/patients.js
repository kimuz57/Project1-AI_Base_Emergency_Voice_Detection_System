// ============================================
// Guardian AI — Patients Routes
// ============================================
const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────
// GET /patients — list all patients
// ──────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        p.id, p.name, p.room, p.notes, p.created_at,
        d.name as device_name, d.code as device_code, d.status as device_status,
        u.name as caregiver_name
      FROM patients p
      LEFT JOIN devices d ON p.device_id = d.id
      LEFT JOIN users u ON p.caregiver_id = u.id
      ORDER BY p.name ASC`
    );

    res.json({ patients: rows });
  } catch (err) {
    console.error("Patients fetch error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

// ──────────────────────────────────
// POST /patients — add new patient
// ──────────────────────────────────
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, room, device_id, caregiver_id, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: "กรุณาระบุชื่อผู้ป่วย" });
    }

    const [result] = await db.query(
      "INSERT INTO patients (name, room, device_id, caregiver_id, notes) VALUES (?, ?, ?, ?, ?)",
      [name, room || null, device_id || null, caregiver_id || null, notes || null]
    );

    res.status(201).json({
      message: "เพิ่มผู้ป่วยสำเร็จ",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Patient create error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

module.exports = router;
