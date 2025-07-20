const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Register new user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
        status: 'error'
      });
    }

    const { email, password, first_name, last_name, role = 'employee', department, position } = req.body;

    // Security: Prevent admin registration through public endpoint
    if (role === 'admin') {
      return res.status(403).json({
        message: 'Admin accounts can only be created by existing administrators',
        status: 'error'
      });
    }

    // Check if user already exists
    const client = await pool.connect();
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({
        message: 'User with this email already exists',
        status: 'error'
      });
    }

    // Find department_id if department name is provided
    let department_id = null;
    if (department) {
      const deptResult = await client.query('SELECT id FROM departments WHERE name ILIKE $1', [department]);
      if (deptResult.rows.length > 0) {
        department_id = deptResult.rows[0].id;
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, department_id, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, first_name, last_name, role, department_id, position`,
      [email, hashedPassword, first_name, last_name, role, department_id, position]
    );

    client.release();

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET || 'hrms_super_secret_jwt_key_2024',
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0],
      token,
      status: 'success'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Registration failed',
      error: error.message,
      status: 'error'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
        status: 'error'
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      client.release();
      return res.status(401).json({
        message: 'Invalid email or password',
        status: 'error'
      });
    }

    const user = result.rows[0];
    client.release();

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid email or password',
        status: 'error'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'hrms_super_secret_jwt_key_2024',
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
      status: 'success'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: error.message,
      status: 'error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      message: 'Profile retrieved successfully',
      user: req.user,
      status: 'success'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get profile',
      error: error.message,
      status: 'error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, department, position } = req.body;
    const userId = req.user.id;

    const client = await pool.connect();
    const result = await client.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name), 
           department = COALESCE($3, department), 
           position = COALESCE($4, position),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING id, email, first_name, last_name, role, department, position`,
      [first_name, last_name, department, position, userId]
    );

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found',
        status: 'error'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
      status: 'success'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: error.message,
      status: 'error'
    });
  }
};

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().trim().withMessage('First name is required'),
  body('last_name').notEmpty().trim().withMessage('Last name is required'),
  body('role').equals('employee').withMessage('Only employee registration is allowed'),
  body('department').optional().trim(),
  body('position').optional().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('first_name').optional().trim(),
  body('last_name').optional().trim(),
  body('department').optional().trim(),
  body('position').optional().trim()
];

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  registerValidation,
  loginValidation,
  updateProfileValidation
}; 