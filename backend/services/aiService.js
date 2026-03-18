// ============================================
// Guardian AI — AI Service (Python Integration)
// ============================================
const { execFile } = require("child_process");
const path = require("path");
const db = require("../config/db");
const { sendAlertNotification } = require("./lineNotify");

const PYTHON_SCRIPT = path.join(__dirname, "..", "ai", "detect.py");

/**
 * Run Python AI detection on an audio file
 * @param {string} audioPath - Absolute path to .wav file
 * @param {number} eventId - event_sound row ID
 * @param {object} io - Socket.io server instance
 */
async function processAudio(audioPath, eventId, io) {
  console.log(`🧠 AI Processing: ${path.basename(audioPath)} (event #${eventId})`);

  return new Promise((resolve) => {
    execFile(
      "python",
      [PYTHON_SCRIPT, audioPath],
      { timeout: 30000, maxBuffer: 1024 * 1024 },
      async (error, stdout, stderr) => {
        let result = {
          transcribed_text: "",
          keyword_detected: null,
          is_alert: false,
          confidence: 0,
        };

        if (error) {
          console.error("❌ AI script error:", error.message);
          if (stderr) console.error("   stderr:", stderr);
        } else {
          try {
            result = JSON.parse(stdout.trim());
            console.log("✅ AI Result:", JSON.stringify(result));
          } catch (parseErr) {
            console.error("❌ AI output parse error:", parseErr.message);
            console.error("   Raw output:", stdout);
          }
        }

        // Update event_sound in DB
        try {
          await db.query(
            `UPDATE event_sound SET 
              transcribed_text = ?,
              keyword_detected = ?,
              is_alert = ?,
              confidence = ?
            WHERE id = ?`,
            [
              result.transcribed_text || "",
              result.keyword_detected || null,
              result.is_alert ? 1 : 0,
              result.confidence || 0,
              eventId,
            ]
          );
        } catch (dbErr) {
          console.error("❌ DB update error:", dbErr.message);
        }

        // Fetch full event data for notification
        try {
          const [rows] = await db.query(
            `SELECT es.*, d.name as device_name, d.code as device_code
             FROM event_sound es
             LEFT JOIN devices d ON es.device_id = d.id
             WHERE es.id = ?`,
            [eventId]
          );

          if (rows.length > 0) {
            const eventData = rows[0];

            // Emit Socket.io event to frontend
            if (io) {
              io.emit("ai_result", {
                id: eventData.id.toString(),
                event_type: eventData.event_type || "เสียง",
                confidence: parseFloat(eventData.confidence) || result.confidence,
                description:
                  result.is_alert
                    ? `🚨 ตรวจพบคำฉุกเฉิน: "${result.keyword_detected}"`
                    : `ตรวจพบเสียง: "${result.transcribed_text?.substring(0, 50) || "-"}"`,
                zone: eventData.zone || "ไม่ทราบ",
                audio_url: eventData.audio_url,
                icon: result.is_alert ? "warning" : "record_voice_over",
              });
            }

            // Send LINE alert if emergency
            if (result.is_alert) {
              console.log("🚨 ALERT DETECTED! Sending LINE notification...");
              await sendAlertNotification({
                ...eventData,
                ...result,
                confidence: result.confidence,
              });
            }
          }
        } catch (fetchErr) {
          console.error("❌ Event fetch error:", fetchErr.message);
        }

        resolve(result);
      }
    );
  });
}

module.exports = { processAudio };
