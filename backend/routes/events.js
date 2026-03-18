// ============================================
// Guardian AI — Events Routes
// ============================================
const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────
// GET /events — list all events (with filter + pagination)
// Query params: ?type=&search=&page=1&limit=20
// ──────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT 
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
        d.code as device_code
      FROM event_sound es
      LEFT JOIN devices d ON es.device_id = d.id
    `;

    const conditions = [];
    const params = [];

    if (type && type !== "ทั้งหมด") {
      conditions.push("es.event_type = ?");
      params.push(type);
    }

    if (search) {
      conditions.push("(es.description LIKE ? OR es.zone LIKE ? OR es.transcribed_text LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY es.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(sql, params);

    // Get total count for pagination
    let countSql = "SELECT COUNT(*) as total FROM event_sound es";
    if (conditions.length > 0) {
      countSql += " WHERE " + conditions.join(" AND ");
    }
    const [countResult] = await db.query(
      countSql,
      params.slice(0, params.length - 2)
    );

    // Map icon for frontend
    const events = rows.map((row) => ({
      ...row,
      icon: row.is_alert ? "warning" : "record_voice_over",
      confidence: parseFloat(row.confidence),
    }));

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Events fetch error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

// ──────────────────────────────────
// GET /events/:id — single event detail
// ──────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT es.*, d.name as device_name, d.code as device_code
       FROM event_sound es
       LEFT JOIN devices d ON es.device_id = d.id
       WHERE es.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบ event" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Event detail error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

module.exports = router;
