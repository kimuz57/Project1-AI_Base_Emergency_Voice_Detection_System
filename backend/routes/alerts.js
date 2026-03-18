// ============================================
// Guardian AI — Alerts Routes
// ============================================
const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────
// GET /alerts — list alert events only (is_alert = 1)
// Query params: ?page=1&limit=20
// ──────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await db.query(
      `SELECT 
        es.id,
        es.event_type,
        es.confidence,
        es.description,
        es.zone,
        es.audio_url,
        es.transcribed_text,
        es.keyword_detected,
        es.is_alert,
        es.created_at,
        d.name as device_name,
        d.code as device_code,
        al.notified_at,
        al.notified_via
      FROM event_sound es
      LEFT JOIN devices d ON es.device_id = d.id
      LEFT JOIN alert_log al ON al.event_id = es.id
      WHERE es.is_alert = 1
      ORDER BY es.created_at DESC
      LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM event_sound WHERE is_alert = 1"
    );

    const alerts = rows.map((row) => ({
      ...row,
      icon: "warning",
      confidence: parseFloat(row.confidence),
    }));

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Alerts fetch error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

module.exports = router;
