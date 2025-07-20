const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/database');

// Get all leaves (Admin sees all, Employee sees their own)
router.get('/', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    let result;
    
    if (req.user.role === 'admin') {
      // Admin sees all leaves
      result = await client.query(`
        SELECT l.*, 
               u.first_name, u.last_name, u.email,
               approver.first_name as approver_first_name, approver.last_name as approver_last_name
        FROM leaves l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN users approver ON l.approved_by = approver.id
        ORDER BY l.created_at DESC
      `);
    } else {
      // Employee sees only their own leaves
      result = await client.query(`
        SELECT l.*, 
               u.first_name, u.last_name, u.email,
               approver.first_name as approver_first_name, approver.last_name as approver_last_name
        FROM leaves l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN users approver ON l.approved_by = approver.id
        WHERE l.user_id = $1
        ORDER BY l.created_at DESC
      `, [req.user.id]);
    }
    
    client.release();
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
  }
});

// Get leave by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT l.*, 
             u.first_name, u.last_name, u.email,
             approver.first_name as approver_first_name, approver.last_name as approver_last_name
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE l.id = $1
    `, [id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }
    
    // Check if user has permission to view this leave
    const leave = result.rows[0];
    if (req.user.role !== 'admin' && leave.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, data: leave });
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave' });
  }
});

// Create new leave request
router.post('/', auth, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const client = await pool.connect();
    
    // Check if dates are valid
    const start = new Date(start_date);
    const end = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      client.release();
      return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
    }
    
    if (end < start) {
      client.release();
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }
    
    const result = await client.query(`
      INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [req.user.id, leave_type, start_date, end_date, reason]);
    
    client.release();
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({ success: false, message: 'Failed to create leave request' });
  }
});

// Update leave status (Admin only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE leaves 
      SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, req.user.id, id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, message: 'Failed to update leave status' });
  }
});

// Delete leave request
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    // Check if leave exists and user has permission
    const leaveCheck = await client.query('SELECT user_id, status FROM leaves WHERE id = $1', [id]);
    
    if (leaveCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }
    
    const leave = leaveCheck.rows[0];
    
    // Only allow deletion if user owns the leave or is admin, and status is pending
    if (req.user.role !== 'admin' && leave.user_id !== req.user.id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (leave.status !== 'pending') {
      client.release();
      return res.status(400).json({ success: false, message: 'Cannot delete approved/rejected leave' });
    }
    
    const result = await client.query('DELETE FROM leaves WHERE id = $1 RETURNING id', [id]);
    client.release();
    
    res.json({ success: true, message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({ success: false, message: 'Failed to delete leave request' });
  }
});

// Get leave statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    let result;
    if (req.user.role === 'admin') {
      // Admin sees all stats
      result = await client.query(`
        SELECT 
          COUNT(*) as total_leaves,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_leaves,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_leaves,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_leaves
        FROM leaves
      `);
    } else {
      // Employee sees their own stats
      result = await client.query(`
        SELECT 
          COUNT(*) as total_leaves,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_leaves,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_leaves,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_leaves
        FROM leaves
        WHERE user_id = $1
      `, [req.user.id]);
    }
    
    client.release();
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching leave stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave statistics' });
  }
});

module.exports = router; 