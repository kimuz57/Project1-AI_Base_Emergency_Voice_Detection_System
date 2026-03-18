// ============================================
// Guardian AI — Devices Routes
// ============================================
const express = require("express");
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────
// GET /devices — list all devices
// ──────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        id, name, code, status, 
        signal_strength as signal, 
        temperature,
        warning_message as warningMessage,
        last_seen,
        created_at
      FROM devices
      ORDER BY code ASC`
    );

    // Summary stats
    const totalNodes = rows.length;
    const onlineNodes = rows.filter((d) => d.status === "online").length;
    const alertCount = rows.filter((d) => d.status === "warning").length;

    res.json({
      devices: rows,
      stats: {
        totalNodes,
        onlineNodes,
        alertCount,
      },
    });
  } catch (err) {
    console.error("Devices fetch error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

// ──────────────────────────────────
// GET /devices/:id — single device
// ──────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM devices WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Device detail error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

module.exports = router;
