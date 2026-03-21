const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");

async function check() {
  try {
    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "guardian_ai"
    });

    console.log("--- Latest 5 Event Records ---");
    const [rows] = await pool.query("SELECT * FROM event_sound ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));

    console.log("\n--- Storage Check ---");
    const audioDir = path.join(__dirname, "uploads", "audio");
    if (fs.existsSync(audioDir)) {
      const files = fs.readdirSync(audioDir);
      console.log(`Found ${files.length} audio files in uploads/audio/`);
    } else {
      console.log("Directory uploads/audio/ does NOT exist.");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

check();
