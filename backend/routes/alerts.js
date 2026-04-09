const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyToken);

/**
 * GET /alerts
 * Get all alerts with filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        al.*,
        e.device_id,
        e.keyword_detected,
        e.alert_level as event_level,
        d.device_name,
        p.patient_code,
        u.first_name,
        u.last_name
      FROM alert_log al
      JOIN event_sound e ON al.event_id = e.event_id
      LEFT JOIN device d ON e.device_id = d.device_id
      LEFT JOIN patient_profile p ON e.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;

    let params = [];

    if (status) {
      query += ` AND al.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY al.sent_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [alerts] = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM alert_log WHERE 1=1`;
    let countParams = [];

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      count: alerts.length,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: alerts
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

/**
 * PUT /alerts/:alertId
 * Update alert status (mark as acknowledged)
 */
router.put('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status } = req.body;

    if (!status || !['sent', 'failed', 'acknowledged'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = { status };
    if (status === 'acknowledged') {
      updateData.acknowledged_at = new Date();
    }

    let query = 'UPDATE alert_log SET status = ?';
    let params = [status];

    if (status === 'acknowledged') {
      query += ', acknowledged_at = NOW()';
    }

    query += ' WHERE alert_id = ?';
    params.push(alertId);

    await pool.query(query, params);

    res.json({
      success: true,
      message: 'Alert updated successfully'
    });

  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

/**
 * GET /alerts/summary
 * Get alert summary and statistics
 */
router.get('/summary/dashboard', async (req, res) => {
  try {
    // Active (unacknowledged) alerts
    const [activeAlerts] = await pool.query(`
      SELECT COUNT(*) as count FROM alert_log WHERE status != 'acknowledged'
    `);

    // Today's alerts
    const [todayAlerts] = await pool.query(`
      SELECT COUNT(*) as count FROM alert_log WHERE DATE(sent_at) = CURDATE()
    `);

    // High priority alerts (level 3 & 4)
    const [criticalAlerts] = await pool.query(`
      SELECT COUNT(*) as count FROM alert_log al
      JOIN event_sound e ON al.event_id = e.event_id
      WHERE e.alert_level IN ('3', '4') AND al.status != 'acknowledged'
    `);

    // Recent failed alerts
    const [failedAlerts] = await pool.query(`
      SELECT COUNT(*) as count FROM alert_log WHERE status = 'failed'
    `);

    res.json({
      success: true,
      summary: {
        active_alerts: activeAlerts[0].count,
        today_alerts: todayAlerts[0].count,
        critical_alerts: criticalAlerts[0].count,
        failed_alerts: failedAlerts[0].count
      }
    });

  } catch (error) {
    console.error('Get alert summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert summary',
      error: error.message
    });
  }
});

module.exports = router;
