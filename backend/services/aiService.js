const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const lineNotify = require('./lineNotify');
const pool = require('../config/db');
require('dotenv').config();

const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000;

/**
 * Process audio file through Python AI model
 * @param {object} audioData - { deviceCode, filepath, io, filename, timestamp }
 */
async function processAudio(audioData) {
  return new Promise((resolve, reject) => {
    const { deviceCode, filepath, io, filename } = audioData;

    console.log(`[AI] Starting audio processing: ${filename}`);

    // Spawn Python process
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../ai/detect.py'),
      filepath
    ]);

    let outputData = '';
    let errorData = '';
    let timeout = null;

    // Set timeout for AI processing
    timeout = setTimeout(() => {
      pythonProcess.kill();
      cleanup();
      reject(new Error('AI processing timeout'));
    }, AI_SERVICE_TIMEOUT);

    // Capture stdout
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`[AI] Python stderr: ${data}`);
    });

    // Handle process completion
    pythonProcess.on('close', async (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        console.error(`[AI] Python process exited with code ${code}`);
        console.error(`[AI] Error output: ${errorData}`);
        cleanup();
        return reject(new Error(`Python process failed with code ${code}`));
      }

      try {
        console.log(`[AI] Raw output: ${outputData}`);

        // Parse JSON result from Python
        const result = JSON.parse(outputData);
        console.log(`[AI] Detection result:`, result);

        // Validate result structure
        if (!result.is_alert && result.is_alert !== 0) {
          throw new Error('Invalid AI result structure');
        }

        // Find device in database
        const [devices] = await pool.query(
          'SELECT device_id, patient_id FROM device WHERE device_code = ?',
          [deviceCode]
        );

        if (devices.length === 0) {
          console.warn(`[AI] Device not found: ${deviceCode}`);
          cleanup();
          return resolve();
        }

        const device = devices[0];

        // Insert event into database
        const [eventResult] = await pool.query(
          `INSERT INTO event_sound 
          (device_id, patient_id, transcribed_text, keyword_detected, is_alert, confidence, alert_level, event_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            device.device_id,
            device.patient_id,
            result.transcribed_text || '',
            result.keyword || '',
            result.is_alert ? 1 : 0,
            result.confidence || 0,
            result.level || 'none',
            result.event_type || 'voice_detection'
          ]
        );

        console.log(`[AI] Event saved: event_id=${eventResult.insertId}`);

        // If alert detected, send notifications
        if (result.is_alert) {
          console.log(`[AI] Alert detected! Level: ${result.level}`);

          // Log alert
          await pool.query(
            `INSERT INTO alert_log (event_id, alert_level, message, status)
            VALUES (?, ?, ?, ?)`,
            [eventResult.insertId, result.level, `Alert: ${result.keyword}`, 'sent']
          );

          // Send LINE notification
          try {
            const patientInfo = device.patient_id 
              ? await getPatientInfo(device.patient_id)
              : {};

            const message = formatAlertMessage(
              result.keyword,
              result.level,
              deviceCode,
              result.confidence,
              patientInfo
            );

            await lineNotify.send({
              message,
              deviceCode,
              patientId: device.patient_id,
              keyword: result.keyword,
              level: result.level
            });
          } catch (notifyError) {
            console.error('[AI] LINE notification error:', notifyError);
          }
        }

        // Emit to connected clients via Socket.io
        io.emit('audio_processed', {
          deviceCode,
          eventId: eventResult.insertId,
          is_alert: result.is_alert,
          transcribed_text: result.transcribed_text,
          keyword: result.keyword,
          confidence: result.confidence,
          level: result.level,
          timestamp: new Date()
        });

        cleanup();
        resolve();

      } catch (error) {
        console.error('[AI] Error processing result:', error);
        cleanup();
        reject(error);
      }
    });
  });
}

/**
 * Get patient information from database
 */
async function getPatientInfo(patientId) {
  try {
    const [patients] = await pool.query(
      `SELECT p.patient_code, u.first_name, u.last_name, u.phone_number
       FROM patient_profile p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [patientId]
    );

    return patients.length > 0 ? patients[0] : {};
  } catch (error) {
    console.error('[AI] Error fetching patient info:', error);
    return {};
  }
}

/**
 * Format alert message for notification
 */
function formatAlertMessage(keyword, level, deviceCode, confidence, patientInfo) {
  const levelEmoji = {
    '1': '🟢',
    '2': '🟡',
    '3': '🟠',
    '4': '🔴'
  };

  const levelText = {
    '1': 'Low',
    '2': 'Medium',
    '3': 'High',
    '4': 'Critical'
  };

  let message = `${levelEmoji[level] || '⚠️'} ALERT - ${levelText[level] || 'Unknown'} Priority\n\n`;
  message += `🎙️ Keyword: ${keyword}\n`;
  message += `📱 Device: ${deviceCode}\n`;
  message += `🎯 Confidence: ${(confidence * 100).toFixed(1)}%\n`;

  if (patientInfo.first_name) {
    message += `👤 Patient: ${patientInfo.first_name} ${patientInfo.last_name}\n`;
  }

  message += `⏰ Time: ${new Date().toLocaleString()}\n`;

  return message;
}

/**
 * Cleanup temporary files
 */
function cleanup() {
  // Could implement cleanup of temporary audio files here
  console.log('[AI] Cleanup completed');
}

module.exports = {
  processAudio
};
