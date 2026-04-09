const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyToken);

/**
 * GET /devices
 * Get all devices (with filtering by patient)
 */
router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;

    let query = 'SELECT d.*, u.first_name, u.last_name, p.patient_code FROM device d LEFT JOIN patient_profile p ON d.patient_id = p.id LEFT JOIN users u ON p.user_id = u.id';
    let params = [];

    if (patientId) {
      query += ' WHERE d.patient_id = ?';
      params.push(patientId);
    }

    query += ' ORDER BY d.created_at DESC';

    const [devices] = await pool.query(query, params);

    res.json({
      success: true,
      count: devices.length,
      data: devices
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices',
      error: error.message
    });
  }
});

/**
 * POST /devices
 * Create new device (ESP32)
 */
router.post('/', requireRole(['admin', 'caregiver']), async (req, res) => {
  try {
    const { device_name, device_code, patient_id } = req.body;

    if (!device_name || !device_code) {
      return res.status(400).json({
        success: false,
        message: 'device_name and device_code are required'
      });
    }

    // Check if device_code already exists
    const [existing] = await pool.query(
      'SELECT id FROM device WHERE device_code = ?',
      [device_code]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Device code already exists'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO device (device_name, device_code, patient_id, device_status) VALUES (?, ?, ?, ?)',
      [device_name, device_code, patient_id || null, 'offline']
    );

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      device_id: result.insertId
    });

  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create device',
      error: error.message
    });
  }
});

/**
 * GET /devices/:deviceId
 * Get device details
 */
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const [devices] = await pool.query(
      'SELECT d.*, p.patient_code, u.first_name, u.last_name FROM device d LEFT JOIN patient_profile p ON d.patient_id = p.id LEFT JOIN users u ON p.user_id = u.id WHERE d.device_id = ?',
      [deviceId]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: devices[0]
    });

  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device',
      error: error.message
    });
  }
});

/**
 * PUT /devices/:deviceId
 * Update device
 */
router.put('/:deviceId', requireRole(['admin', 'caregiver']), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { device_name, patient_id, device_status } = req.body;

    let updateQuery = 'UPDATE device SET';
    let params = [];
    let updates = [];

    if (device_name !== undefined) {
      updates.push(' device_name = ?');
      params.push(device_name);
    }

    if (patient_id !== undefined) {
      updates.push(' patient_id = ?');
      params.push(patient_id);
    }

    if (device_status !== undefined) {
      updates.push(' device_status = ?');
      params.push(device_status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateQuery += updates.join(',');
    updateQuery += ' WHERE device_id = ?';
    params.push(deviceId);

    await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: 'Device updated successfully'
    });

  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device',
      error: error.message
    });
  }
});

/**
 * DELETE /devices/:deviceId
 * Delete device
 */
router.delete('/:deviceId', requireRole(['admin']), async (req, res) => {
  try {
    const { deviceId } = req.params;

    await pool.query('DELETE FROM device WHERE device_id = ?', [deviceId]);

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });

  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete device',
      error: error.message
    });
  }
});

module.exports = router;
