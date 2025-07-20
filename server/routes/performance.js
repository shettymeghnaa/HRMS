const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { pool } = require('../config/database');

// Middleware to check admin/manager
const requireAdminOrManager = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Admin or manager access required', status: 'error' });
  }
  next();
};

// Get all employees for review selection (admin/manager only)
router.get('/employees/list', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.position, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'employee' AND u.is_active = true
      ORDER BY u.first_name, u.last_name
    `);
    client.release();
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees for review:', error);
    res.status(500).json({ message: 'Failed to fetch employees', status: 'error' });
  }
});

// Add a performance review (admin/manager only)
router.post('/:employeeId', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { rating, comments } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5', status: 'error' });
    }
    
    // Check if employee exists and is active
    const client = await pool.connect();
    const employeeCheck = await client.query(
      'SELECT id FROM users WHERE id = $1 AND role = \'employee\' AND is_active = true',
      [employeeId]
    );
    
    if (employeeCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Employee not found or inactive', status: 'error' });
    }
    
    await client.query(
      `INSERT INTO performance_reviews (employee_id, reviewer_id, rating, comments) VALUES ($1, $2, $3, $4)`,
      [employeeId, req.user.id, rating, comments || null]
    );
    client.release();
    res.json({ success: true, message: 'Performance review added successfully' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Failed to add review', status: 'error' });
  }
});

// Get all reviews for an employee
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Check if user can view this employee's reviews
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: 'Access denied', status: 'error' });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      `SELECT r.id, r.rating, r.comments, r.review_date, 
              u.first_name AS reviewer_first_name, u.last_name AS reviewer_last_name, u.role AS reviewer_role
         FROM performance_reviews r
         LEFT JOIN users u ON r.reviewer_id = u.id
        WHERE r.employee_id = $1
        ORDER BY r.review_date DESC`,
      [employeeId]
    );
    client.release();
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', status: 'error' });
  }
});

// Get all performance reviews (admin/manager only)
router.get('/', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        r.id, r.rating, r.comments, r.review_date,
        emp.first_name AS employee_first_name, emp.last_name AS employee_last_name, 
        emp.email AS employee_email, emp.position AS employee_position,
        d.name AS employee_department,
        rev.first_name AS reviewer_first_name, rev.last_name AS reviewer_last_name, 
        rev.role AS reviewer_role
      FROM performance_reviews r
      JOIN users emp ON r.employee_id = emp.id
      LEFT JOIN departments d ON emp.department_id = d.id
      LEFT JOIN users rev ON r.reviewer_id = rev.id
      ORDER BY r.review_date DESC
    `);
    client.release();
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', status: 'error' });
  }
});

module.exports = router; 