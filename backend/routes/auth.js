const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
require('dotenv').config();

const router = express.Router();

/**
 * POST /auth/register
 * Register new user (caregiver or patient)
 */
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone_number, role } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: first_name, last_name, email, password'
      });
    }

    // Check if user already exists
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userRole = role && ['admin', 'caregiver', 'patient'].includes(role) 
      ? role 
      : 'caregiver';

    const [result] = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password, phone_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, email, hashedPassword, phone_number || null, userRole, 'active']
    );

    // If patient role, create patient profile
    if (userRole === 'patient') {
      const patientCode = `PAT${Date.now()}`;
      await pool.query(
        'INSERT INTO patient_profile (user_id, patient_code) VALUES (?, ?)',
        [result.insertId, patientCode]
      );
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId,
      role: userRole
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // Find user
    const [users] = await pool.query(
      'SELECT id, first_name, last_name, email, password, role, status FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check user status
    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Account disabled'
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * GET /auth/profile
 * Get current user profile (requires auth)
 */
router.get('/profile', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, first_name, last_name, email, phone_number, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

module.exports = router;
