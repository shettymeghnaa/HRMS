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

// Get attendance report
router.get('/attendance', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, d.name as department_name,
        COUNT(CASE WHEN a.status = 'Checked In' THEN 1 END) as check_ins,
        COUNT(CASE WHEN a.status = 'Checked Out' THEN 1 END) as check_outs,
        MIN(CASE WHEN a.status = 'Checked In' THEN a.check_time END) as first_check_in,
        MAX(CASE WHEN a.status = 'Checked Out' THEN a.check_time END) as last_check_out
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN attendance a ON u.id = a.user_id
      WHERE u.role = 'employee'
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (startDate) {
      paramCount++;
      query += ` AND DATE(a.check_time) >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND DATE(a.check_time) <= $${paramCount}`;
      params.push(endDate);
    }
    
    if (departmentId) {
      paramCount++;
      query += ` AND u.department_id = $${paramCount}`;
      params.push(departmentId);
    }
    
    query += ` GROUP BY u.id, u.first_name, u.last_name, u.email, d.name ORDER BY u.first_name`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ message: 'Failed to generate attendance report', status: 'error' });
  }
});

// Get leave report
router.get('/leaves', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { startDate, endDate, status, departmentId } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT 
        l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status,
        u.first_name, u.last_name, u.email, d.name as department_name,
        CASE 
          WHEN l.approved_by IS NOT NULL THEN CONCAT(approver.first_name, ' ', approver.last_name)
          ELSE 'Pending'
        END as approved_by_name,
        l.created_at
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (startDate) {
      paramCount++;
      query += ` AND l.start_date >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND l.end_date <= $${paramCount}`;
      params.push(endDate);
    }
    
    if (status) {
      paramCount++;
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
    }
    
    if (departmentId) {
      paramCount++;
      query += ` AND u.department_id = $${paramCount}`;
      params.push(departmentId);
    }
    
    query += ` ORDER BY l.created_at DESC`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error generating leave report:', error);
    res.status(500).json({ message: 'Failed to generate leave report', status: 'error' });
  }
});

// Get payroll report
router.get('/payroll', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { departmentId } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.position, u.salary,
        d.name as department_name, u.hire_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.hire_date)) as years_of_service
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'employee'
    `;
    
    const params = [];
    
    if (departmentId) {
      query += ` AND u.department_id = $1`;
      params.push(departmentId);
    }
    
    query += ` ORDER BY u.salary DESC`;
    
    const result = await client.query(query, params);
    
    // Calculate summary statistics
    const totalSalary = result.rows.reduce((sum, emp) => sum + parseFloat(emp.salary || 0), 0);
    const avgSalary = result.rows.length > 0 ? totalSalary / result.rows.length : 0;
    const minSalary = Math.min(...result.rows.map(emp => parseFloat(emp.salary || 0)));
    const maxSalary = Math.max(...result.rows.map(emp => parseFloat(emp.salary || 0)));
    
    client.release();
    
    res.json({ 
      success: true, 
      data: result.rows,
      summary: {
        totalEmployees: result.rows.length,
        totalSalary,
        averageSalary: avgSalary,
        minSalary,
        maxSalary
      }
    });
  } catch (error) {
    console.error('Error generating payroll report:', error);
    res.status(500).json({ message: 'Failed to generate payroll report', status: 'error' });
  }
});

// Get performance report
router.get('/performance', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, d.name as department_name,
        COUNT(pr.id) as total_reviews,
        AVG(pr.rating) as average_rating,
        MIN(pr.rating) as min_rating,
        MAX(pr.rating) as max_rating,
        MAX(pr.review_date) as last_review_date
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN performance_reviews pr ON u.id = pr.employee_id
      WHERE u.role = 'employee'
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (startDate) {
      paramCount++;
      query += ` AND pr.review_date >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND pr.review_date <= $${paramCount}`;
      params.push(endDate);
    }
    
    if (departmentId) {
      paramCount++;
      query += ` AND u.department_id = $${paramCount}`;
      params.push(departmentId);
    }
    
    query += ` GROUP BY u.id, u.first_name, u.last_name, u.email, d.name ORDER BY average_rating DESC NULLS LAST`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ message: 'Failed to generate performance report', status: 'error' });
  }
});

// Get department summary
router.get('/departments', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        d.id, d.name, d.description,
        COUNT(u.id) as employee_count,
        AVG(u.salary) as average_salary,
        SUM(u.salary) as total_salary,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_employees
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id AND u.role = 'employee'
      GROUP BY d.id, d.name, d.description
      ORDER BY employee_count DESC
    `);
    
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error generating department report:', error);
    res.status(500).json({ message: 'Failed to generate department report', status: 'error' });
  }
});

// Get dashboard analytics
router.get('/analytics', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get today's attendance
    const todayAttendance = await client.query(`
      SELECT COUNT(DISTINCT user_id) as present_today
      FROM attendance 
      WHERE DATE(check_time) = CURRENT_DATE AND status = 'Checked In'
    `);
    
    // Get employees on leave today
    const onLeaveToday = await client.query(`
      SELECT COUNT(DISTINCT user_id) as on_leave_today
      FROM leaves 
      WHERE CURRENT_DATE BETWEEN start_date AND end_date AND status = 'approved'
    `);
    
    // Get total employees
    const totalEmployees = await client.query(`
      SELECT COUNT(*) as total_employees
      FROM users 
      WHERE role = 'employee' AND is_active = true
    `);
    
    // Get recent activities
    const recentActivities = await client.query(`
      (SELECT 'attendance' as type, u.first_name, u.last_name, a.check_time as timestamp, a.status as action
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.check_time DESC LIMIT 5)
      UNION ALL
      (SELECT 'leave' as type, u.first_name, u.last_name, l.created_at as timestamp, l.status as action
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC LIMIT 5)
      ORDER BY timestamp DESC LIMIT 10
    `);
    
    client.release();
    
    res.json({ 
      success: true, 
      data: {
        presentToday: todayAttendance.rows[0]?.present_today || 0,
        onLeaveToday: onLeaveToday.rows[0]?.on_leave_today || 0,
        totalEmployees: totalEmployees.rows[0]?.total_employees || 0,
        recentActivities: recentActivities.rows
      }
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ message: 'Failed to generate analytics', status: 'error' });
  }
});

module.exports = router; 