const axios = require('axios');
require('dotenv').config();

/**
 * Send notification via LINE Notify API
 * @param {object} notificationData - Notification details
 */
async function send(notificationData) {
  try {
    const lineToken = process.env.LINE_NOTIFY_TOKEN;

    if (!lineToken) {
      console.warn('[LINE] LINE_NOTIFY_TOKEN not configured');
      return;
    }

    const { message, deviceCode } = notificationData;

    console.log(`[LINE] Sending notification for device: ${deviceCode}`);

    const response = await axios.post(
      'https://notify-api.line.me/api/notify',
      `message=${encodeURIComponent(message)}`,
      {
        headers: {
          'Authorization': `Bearer ${lineToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log(`[LINE] Notification sent successfully. Status: ${response.data.status}`);

  } catch (error) {
    if (error.response) {
      console.error(`[LINE] API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.code === 'ECONNABORTED') {
      console.error('[LINE] Request timeout');
    } else {
      console.error('[LINE] Error sending notification:', error.message);
    }
  }
}

/**
 * Send notification to specific user via LINE
 * @param {number} userId - User ID
 * @param {string} message - Message content
 */
async function sendToUser(userId, message) {
  try {
    const lineToken = process.env.LINE_NOTIFY_TOKEN;

    if (!lineToken) {
      console.warn('[LINE] LINE_NOTIFY_TOKEN not configured');
      return;
    }

    console.log(`[LINE] Sending message to user: ${userId}`);

    const response = await axios.post(
      'https://notify-api.line.me/api/notify',
      `message=${encodeURIComponent(message)}`,
      {
        headers: {
          'Authorization': `Bearer ${lineToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log(`[LINE] Message sent to user ${userId}`);

  } catch (error) {
    console.error('[LINE] Error sending user notification:', error.message);
  }
}

/**
 * Send rich menu or sticker with message
 */
async function sendWithSticker(message, stickerId = '100') {
  try {
    const lineToken = process.env.LINE_NOTIFY_TOKEN;

    if (!lineToken) {
      console.warn('[LINE] LINE_NOTIFY_TOKEN not configured');
      return;
    }

    const response = await axios.post(
      'https://notify-api.line.me/api/notify',
      `message=${encodeURIComponent(message)}`,
      {
        headers: {
          'Authorization': `Bearer ${lineToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('[LINE] Message with sticker sent successfully');

  } catch (error) {
    console.error('[LINE] Error sending sticker notification:', error.message);
  }
}

module.exports = {
  send,
  sendToUser,
  sendWithSticker
};
