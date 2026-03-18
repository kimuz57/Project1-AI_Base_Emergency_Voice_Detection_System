// ============================================
// Guardian AI — LINE Notify Service
// ============================================
const axios = require("axios");
const db = require("../config/db");
require("dotenv").config();

const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const LINE_API_URL = "https://notify-api.line.me/api/notify";

/**
 * Send LINE Notify message
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} success
 */
async function sendLineNotify(message) {
  if (!LINE_NOTIFY_TOKEN || LINE_NOTIFY_TOKEN === "YOUR_LINE_NOTIFY_TOKEN_HERE") {
    console.log("⚠️  LINE Notify token not set — skipping notification");
    console.log("   Message:", message);
    return false;
  }

  try {
    await axios.post(
      LINE_API_URL,
      `message=${encodeURIComponent(message)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
        },
      }
    );
    console.log("📱 LINE Notify sent:", message.substring(0, 50) + "...");
    return true;
  } catch (err) {
    console.error("❌ LINE Notify error:", err.response?.data || err.message);
    return false;
  }
}

/**
 * Send alert and log it
 * @param {object} eventData - Event data from event_sound
 */
async function sendAlertNotification(eventData) {
  const message =
    `\n🚨 Guardian AI แจ้งเตือน!\n` +
    `────────────────\n` +
    `🔊 คำที่ตรวจพบ: ${eventData.keyword_detected || "ไม่ทราบ"}\n` +
    `📝 ข้อความ: ${eventData.transcribed_text || "-"}\n` +
    `📍 โซน: ${eventData.zone || "-"}\n` +
    `📊 ความมั่นใจ: ${(eventData.confidence * 100).toFixed(1)}%\n` +
    `⏰ เวลา: ${new Date().toLocaleString("th-TH")}\n` +
    `────────────────\n` +
    `กรุณาตรวจสอบทันที!`;

  const success = await sendLineNotify(message);

  // Log to alert_log
  try {
    await db.query(
      "INSERT INTO alert_log (event_id, notified_via, message) VALUES (?, ?, ?)",
      [eventData.id, "LINE", message]
    );
  } catch (err) {
    console.error("Alert log error:", err.message);
  }

  return success;
}

module.exports = { sendLineNotify, sendAlertNotification };
