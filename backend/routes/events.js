const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyToken);

/**
 * GET /events
 * Get all events with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { deviceId, patientId, isAlert, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        e.*,
        d.device_name,
        d.device_code,
        p.patient_code,
        u.first_name,
        u.last_name
      FROM event_sound e
      LEFT JOIN device d ON e.device_id = d.device_id
      LEFT JOIN patient_profile p ON e.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;

    let params = [];

    if (deviceId) {
      query += ` AND e.device_id = ?`;
      params.push(deviceId);
    }

    if (patientId) {
      query += ` AND e.patient_id = ?`;
      params.push(patientId);
    }

    if (isAlert !== undefined) {
      query += ` AND e.is_alert = ?`;
      params.push(isAlert === 'true' ? 1 : 0);
    }

    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [events] = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM event_sound WHERE 1=1`;
    let countParams = [];

    if (deviceId) {
      countQuery += ` AND device_id = ?`;
      countParams.push(deviceId);
    }
    if (patientId) {
      countQuery += ` AND patient_id = ?`;
      countParams.push(patientId);
    }
    if (isAlert !== undefined) {
      countQuery += ` AND is_alert = ?`;
      countParams.push(isAlert === 'true' ? 1 : 0);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      count: events.length,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: events
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

/**
 * GET /events/:eventId
 * Get event details
 */
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const [events] = await pool.query(`
      SELECT 
        e.*,
        d.device_name,
        d.device_code,
        p.patient_code,
        u.first_name,
        u.last_name
      FROM event_sound e
      LEFT JOIN device d ON e.device_id = d.device_id
      LEFT JOIN patient_profile p ON e.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE e.event_id = ?
    `, [eventId]);

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: events[0]
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
});

/**
 * GET /events/summary/stats
 * Get statistics dashboard data
 */
router.get('/summary/stats', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    let timeCondition = 'DATE(e.created_at) = CURDATE()';

    if (timeRange === '7d') {
      timeCondition = 'e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (timeRange === '30d') {
      timeCondition = 'e.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_events,
        SUM(e.is_alert) as alert_count,
        COUNT(DISTINCT e.device_id) as active_devices,
        COUNT(DISTINCT e.patient_id) as patients_with_events,
        AVG(e.confidence) as avg_confidence
      FROM event_sound e
      WHERE ${timeCondition}
    `);

    const [alertsByLevel] = await pool.query(`
      SELECT 
        e.alert_level,
        COUNT(*) as count
      FROM event_sound e
      WHERE e.is_alert = 1 AND ${timeCondition}
      GROUP BY e.alert_level
    `);

    const [topKeywords] = await pool.query(`
      SELECT 
        e.keyword_detected,
        COUNT(*) as count
      FROM event_sound e
      WHERE e.is_alert = 1 AND ${timeCondition}
      GROUP BY e.keyword_detected
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: stats[0],
      alerts_by_level: alertsByLevel,
      top_keywords: topKeywords
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;
