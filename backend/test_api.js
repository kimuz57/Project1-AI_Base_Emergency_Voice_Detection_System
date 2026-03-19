const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
require("dotenv").config();

async function runTests() {
  console.log("=== Guardian AI API Verification ===");
  const baseUrl = "http://localhost:3001";
  
  // 1. Health check
  console.log("\n[1] Testing Health Check -> GET /");
  try {
    let res = await fetch(baseUrl + "/");
    console.log("Status:", res.status);
    console.log("Body:", await res.json());
  } catch(e) { console.log(e.message); }

  // 2. Generate direct JWT token
  console.log("\n[2] Generating Local JWT Token for Testing");
  const token = jwt.sign(
    { id: 1, email: "test@test.com", role: "admin" },
    process.env.JWT_SECRET || "guardian_ai_secret",
    { expiresIn: "1h" }
  );
  console.log("✅ Token generated.");

  // 3. Test Events
  console.log("\n[3] Testing Events -> GET /events");
  try {
    const res = await fetch(baseUrl + "/events", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data.error ? data : "Success! Found " + (data.events?.length || 0) + " events.");
  } catch(e) { console.log(e.message); }

  // 4. Test Devices
  console.log("\n[4] Testing Devices -> GET /devices");
  try {
    const res = await fetch(baseUrl + "/devices", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Stats:", data.error ? data : data.stats);
  } catch(e) { console.log(e.message); }

  // 5. Setup Mock Audio file for Python AI Test
  console.log("\n[5] Testing Python AI script directly");
  const { execSync } = require("child_process");
  try {
    const uploadDir = path.join(__dirname, "uploads", "audio");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    // Create an empty file named test.wav
    const testWav = path.join(uploadDir, "test.wav");
    fs.writeFileSync(testWav, Buffer.from("RIFF")); 
    
    console.log("Executing detect.py...");
    const aiOutput = execSync(`python ai/detect.py "${testWav}"`, { encoding: "utf8" });
    console.log("Python response: " + aiOutput.trim());
  } catch (err) {
    console.log("Python execution expected failure (invalid wav):", err.message);
  }
  
  process.exit(0);
}

runTests();
