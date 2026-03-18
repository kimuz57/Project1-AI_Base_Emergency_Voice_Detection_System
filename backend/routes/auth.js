// ============================================
// Guardian AI — Auth Routes
// ============================================
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "guardian_ai_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ──────────────────────────────────
// POST /auth/login
// ──────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอก email และ password" });
    }

    // Find user
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "ไม่พบบัญชีผู้ใช้นี้" });
    }

    const user = rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

// ──────────────────────────────────
// POST /auth/register
// ──────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
    }

    // Check duplicate
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "อีเมลนี้ถูกใช้แล้ว" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert
    const validRole = ["admin", "caregiver", "patient"].includes(role) ? role : "caregiver";
    await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, password_hash, validRole]
    );

    res.status(201).json({ message: "สร้างบัญชีสำเร็จ" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

module.exports = router;
