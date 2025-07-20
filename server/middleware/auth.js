const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        status: 'error'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hrms_super_secret_jwt_key_2024');
    
    // Get user from database to ensure they still exist and are active
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, email, first_name, last_name, role, department_id, position FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        message: 'User not found or inactive',
        status: 'error'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        status: 'error'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        status: 'error'
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error',
      status: 'error'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Admin access required',
      status: 'error'
    });
  }
  next();
};

// Middleware to check if user is employee or admin
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Employee access required',
      status: 'error'
    });
  }
  next();
};

module.exports = authenticateToken; 