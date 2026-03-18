// ============================================
// Guardian AI — JWT Auth Middleware
// ============================================
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "guardian_ai_secret";

/**
 * Middleware: verify JWT token from Authorization header
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ไม่มี token — กรุณาเข้าสู่ระบบ" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" });
  }
}

/**
 * Middleware: require specific role(s)
 * Usage: requireRole('admin') or requireRole('admin', 'caregiver')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "ไม่มีสิทธิ์เข้าถึง (ต้องเป็น " + roles.join(" / ") + ")" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
