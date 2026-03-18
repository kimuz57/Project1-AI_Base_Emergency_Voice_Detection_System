// ============================================
// Guardian AI — MySQL Connection Pool
// ============================================
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "guardian_ai",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

// Test connection on load
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL connected to:", process.env.DB_NAME || "guardian_ai");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error("   → Make sure MySQL is running and database exists");
    console.error("   → Run: mysql -u root < database/schema.sql");
  }
})();

module.exports = pool;
