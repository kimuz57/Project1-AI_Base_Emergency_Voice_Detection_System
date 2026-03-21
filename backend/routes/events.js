// ============================================
// Guardian AI — Events Routes
// ============================================
const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const audioQueue = require("../services/audioQueue");

const router = express.Router();

// ──────────────────────────────────
// Setup Multer for Web Uploads
// ──────────────────────────────────
const AUDIO_DIR = path.join(__dirname, "..", "uploads", "audio");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AUDIO_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `web_${Date.now()}.wav`);
  },
});

const upload = multer({ storage });

// ──────────────────────────────────
// POST /events/upload-audio — Receive audio from web mic
// ──────────────────────────────────
router.post("/upload-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const filepath = req.file.path;
    const filename = req.file.filename;
    const audioUrl = `/uploads/audio/${filename}`;

    let eventId = null;
    try {
      // Insert initial event record (try but continue if fail for testing)
      const [result] = await db.query(
        `INSERT INTO event_sound (event_type, audio_url, zone, description)
         VALUES ('เสียง (Web)', ?, 'Browser', 'กำลังประมวลผล AI...')`,
        [audioUrl]
      );
      eventId = result.insertId;
      console.log(`📝 Web Event #${eventId} created.`);
    } catch (dbErr) {
      console.error("⚠️ DB Error (skipping):", dbErr.message);
      // We'll continue without eventId for pure AI testing
    }

    // Process AI directly
    const { processAudio } = require("../services/aiService");
    const { execFile } = require("child_process");
    const path = require("path");
    const PYTHON_SCRIPT = path.join(__dirname, "..", "ai", "detect.py");

    // Direct AI execution for testing (bypass DB if needed)
    return new Promise((resolve) => {
      execFile(
        "python",
        [PYTHON_SCRIPT, filepath],
        { timeout: 30000 },
        (error, stdout, stderr) => {
          let aiResult = {
            transcribed_text: "",
            keyword_detected: null,
            is_alert: false,
            confidence: 0,
          };

          if (!error && stdout) {
            try {
              aiResult = JSON.parse(stdout.trim());
              console.log("✅ AI Result:", JSON.stringify(aiResult));
            } catch (pErr) { console.error("Parse error:", pErr.message); }
          } else {
            console.error("AI Error:", error?.message, stderr);
          }

          res.json({
            status: aiResult.is_alert ? "emergency" : "normal",
            confidence: aiResult.confidence,
            transcribed_text: aiResult.transcribed_text,
            keyword: aiResult.keyword_detected
          });
          resolve();
        }
      );
    });

  } catch (err) {
    console.error("Web audio upload error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการประมวลผลเสียง" });
  }
});

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
