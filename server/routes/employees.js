const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/database');

// Get all employees (Admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const client = await pool.connect();
    const result = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.position, 
             u.hire_date, u.salary, u.phone, u.is_active, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role != 'admin'
      ORDER BY u.created_at DESC
    `);
    
    client.release();
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

// Get departments (public endpoint for registration)
router.get('/departments', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM departments ORDER BY name');
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// Get departments (authenticated endpoint)
router.get('/departments/list', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM departments ORDER BY name');
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// Get employee by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const client = await pool.connect();
    const result = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.position, 
             u.hire_date, u.salary, u.phone, u.address, u.is_active, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee' });
  }
});

// Create new employee (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { email, password, first_name, last_name, department_id, position, salary, phone, role = 'employee' } = req.body;

    // Security: Only allow creating employees by default, unless explicitly creating admin
    if (role === 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Use /api/employees/admin endpoint to create admin accounts' 
      });
    }

    const client = await pool.connect();
    
    // Check if email already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, department_id, position, salary, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, first_name, last_name, role, position, hire_date, salary, phone, created_at
    `, [email, hashedPassword, first_name, last_name, department_id, position, salary, phone, role]);

    client.release();
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
});

// Create new admin (Super Admin only)
router.post('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { email, password, first_name, last_name, department_id, position, salary, phone } = req.body;

    // Additional security: Require strong password for admin accounts
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin passwords must be at least 8 characters long' 
      });
    }

    const client = await pool.connect();
    
    // Check if email already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12); // Higher salt rounds for admin accounts

    const result = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, department_id, position, salary, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin')
      RETURNING id, email, first_name, last_name, role, position, hire_date, salary, phone, created_at
    `, [email, hashedPassword, first_name, last_name, department_id, position, salary, phone]);

    client.release();
    
    console.log(`Admin account created by ${req.user.email}: ${email}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin account' });
  }
});

// Update employee
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, department_id, position, salary, phone, address } = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const client = await pool.connect();
    const result = await client.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          department_id = COALESCE($3, department_id),
          position = COALESCE($4, position),
          salary = COALESCE($5, salary),
          phone = COALESCE($6, phone),
          address = COALESCE($7, address),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, email, first_name, last_name, role, position, hire_date, salary, phone, address, updated_at
    `, [first_name, last_name, department_id, position, salary, phone, address, id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
});

// Delete employee (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const client = await pool.connect();
    
    const result = await client.query('DELETE FROM users WHERE id = $1 AND role != \'admin\' RETURNING id', [id]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
});

module.exports = router; 