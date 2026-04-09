const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyToken);

/**
 * GET /patients
 * Get all patients
 */
router.get('/', requireRole(['admin', 'caregiver']), async (req, res) => {
  try {
    const [patients] = await pool.query(`
      SELECT 
        p.id,
        p.user_id,
        p.patient_code,
        p.id_card,
        p.gender,
        p.birth_date,
        p.blood_group,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        COUNT(DISTINCT d.device_id) as device_count,
        COUNT(DISTINCT e.event_id) as event_count
      FROM patient_profile p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN device d ON p.id = d.patient_id
      LEFT JOIN event_sound e ON d.device_id = e.device_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      count: patients.length,
      data: patients
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: error.message
    });
  }
});

/**
 * POST /patients
 * Create new patient profile
 */
router.post('/', requireRole(['admin', 'caregiver']), async (req, res) => {
  try {
    const { user_id, id_card, gender, birth_date, blood_group, weight, height } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const patientCode = `PAT${Date.now()}`;

    const [result] = await pool.query(
      'INSERT INTO patient_profile (user_id, patient_code, id_card, gender, birth_date, blood_group, weight, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, patientCode, id_card || null, gender || null, birth_date || null, blood_group || null, weight || null, height || null]
    );

    res.status(201).json({
      success: true,
      message: 'Patient profile created successfully',
      patient_id: result.insertId,
      patient_code: patientCode
    });

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patient profile',
      error: error.message
    });
  }
});

/**
 * GET /patients/:patientId
 * Get patient details
 */
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const [patients] = await pool.query(`
      SELECT 
        p.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number
      FROM patient_profile p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [patientId]);

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get diseases
    const [diseases] = await pool.query(`
      SELECT d.diseases_id, d.diseases_name, d.description
      FROM patient_diseases pd
      JOIN diseases d ON pd.diseases_id = d.diseases_id
      WHERE pd.patient_id = ?
    `, [patientId]);

    const patient = patients[0];
    patient.diseases = diseases;

    res.json({
      success: true,
      data: patient
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message
    });
  }
});

/**
 * PUT /patients/:patientId
 * Update patient profile
 */
router.put('/:patientId', requireRole(['admin', 'caregiver']), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { id_card, gender, birth_date, blood_group, weight, height, illness, allergy, disease_history } = req.body;

    let updateQuery = 'UPDATE patient_profile SET';
    let params = [];
    let updates = [];

    if (id_card !== undefined) {
      updates.push(' id_card = ?');
      params.push(id_card);
    }
    if (gender !== undefined) {
      updates.push(' gender = ?');
      params.push(gender);
    }
    if (birth_date !== undefined) {
      updates.push(' birth_date = ?');
      params.push(birth_date);
    }
    if (blood_group !== undefined) {
      updates.push(' blood_group = ?');
      params.push(blood_group);
    }
    if (weight !== undefined) {
      updates.push(' weight = ?');
      params.push(weight);
    }
    if (height !== undefined) {
      updates.push(' height = ?');
      params.push(height);
    }
    if (illness !== undefined) {
      updates.push(' illness = ?');
      params.push(illness);
    }
    if (allergy !== undefined) {
      updates.push(' allergy = ?');
      params.push(allergy);
    }
    if (disease_history !== undefined) {
      updates.push(' disease_history = ?');
      params.push(disease_history);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateQuery += updates.join(',');
    updateQuery += ' WHERE id = ?';
    params.push(patientId);

    await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: 'Patient profile updated successfully'
    });

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update patient',
      error: error.message
    });
  }
});

/**
 * POST /patients/:patientId/diseases
 * Add disease to patient
 */
router.post('/:patientId/diseases', requireRole(['admin', 'caregiver']), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { diseases_id } = req.body;

    if (!diseases_id) {
      return res.status(400).json({
        success: false,
        message: 'diseases_id is required'
      });
    }

    await pool.query(
      'INSERT INTO patient_diseases (patient_id, diseases_id) VALUES (?, ?)',
      [patientId, diseases_id]
    );

    res.status(201).json({
      success: true,
      message: 'Disease added to patient'
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Patient already has this disease'
      });
    }
    console.error('Add disease error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add disease',
      error: error.message
    });
  }
});

module.exports = router;
