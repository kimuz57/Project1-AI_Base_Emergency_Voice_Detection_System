/**
 * Guardian AI — LINE Notify Alert
 * ส่ง notification ไปยัง LINE เมื่อตรวจพบเสียงผิดปกติ
 */

const axios = require('axios');
require('dotenv').config();

const LINE_NOTIFY_URL = 'https://notify-api.line.me/api/notify';

/**
 * ส่ง LINE Notify
 * @param {Object} params
 * @param {string} params.keyword       - เสียงที่ตรวจพบ เช่น "scream"
 * @param {string} params.deviceCode    - รหัสอุปกรณ์ เช่น "A01"
 * @param {number} params.confidence    - ความมั่นใจ 0.0 - 1.0
 * @param {string} params.audioUrl      - Path ของ audio file
 * @param {string} [params.room]        - ชื่อห้อง (optional)
 */
async function sendLineAlert({ keyword, deviceCode, confidence, audioUrl, room }) {
    const token = process.env.LINE_NOTIFY_TOKEN;

    if (!token || token === 'YOUR_LINE_NOTIFY_TOKEN_HERE') {
        console.warn('⚠️  LINE_NOTIFY_TOKEN not set — skipping alert');
        return false;
    }

    const emoji = getEmojiForKeyword(keyword);
    const roomLabel = room ? `ห้อง: ${room}` : `อุปกรณ์: ${deviceCode}`;
    const confPercent = Math.round(confidence * 100);

    const message = [
        '',
        `${emoji} Guardian AI แจ้งเตือน!`,
        `──────────────────`,
        `📍 ${roomLabel}`,
        `🔊 เสียงที่ตรวจพบ: ${translateKeyword(keyword)}`,
        `📊 ความน่าเชื่อถือ: ${confPercent}%`,
        `🕐 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
        `──────────────────`,
        `⚡ กรุณาตรวจสอบด่วน!`,
    ].join('\n');

    try {
        const resp = await axios.post(LINE_NOTIFY_URL, new URLSearchParams({ message }), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 5000,
        });

        if (resp.data.status === 200) {
            console.log(`✅ LINE alert sent: [${keyword}] device=${deviceCode} conf=${confPercent}%`);
            return true;
        }
    } catch (err) {
        console.error('❌ LINE Notify error:', err.response?.data || err.message);
    }

    return false;
}

function getEmojiForKeyword(keyword) {
    const map = {
        scream:    '😱',
        crying:    '😢',
        breaking:  '💥',
        gunshot:   '🔫',
        alarm:     '🚨',
        explosion: '💣',
        default:   '⚠️',
    };
    return map[keyword?.toLowerCase()] || map.default;
}

function translateKeyword(keyword) {
    const map = {
        scream:    'เสียงกรีดร้อง',
        crying:    'เสียงร้องไห้',
        breaking:  'เสียงแตกหัก',
        gunshot:   'เสียงปืน',
        alarm:     'เสียงสัญญาณเตือน',
        explosion: 'เสียงระเบิด',
        normal:    'เสียงปกติ',
        unknown:   'ไม่สามารถระบุได้',
    };
    return map[keyword?.toLowerCase()] || keyword;
}

module.exports = { sendLineAlert };
