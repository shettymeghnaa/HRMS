const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/database');

// Get attendance status for today
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user has already checked in today
    const client = await pool.connect();
    const result = await client.query(
      'SELECT status FROM attendance WHERE user_id = $1 AND check_time::date = CURRENT_DATE ORDER BY check_time DESC LIMIT 1',
      [userId]
    );
    
    const status = result.rows.length > 0 ? result.rows[0].status : 'Not checked in';
    
    client.release();
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error checking attendance status:', error);
    res.status(500).json({ success: false, message: 'Failed to check attendance status' });
  }
});

// Check in or check out
router.post('/check', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { action } = req.body;
    
    if (!action || !['checkin', 'checkout'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "checkin" or "checkout"' });
    }
    
    const client = await pool.connect();
    
    // Check current status
    const currentStatus = await client.query(
      'SELECT status FROM attendance WHERE user_id = $1 AND check_time::date = CURRENT_DATE ORDER BY check_time DESC LIMIT 1',
      [userId]
    );
    
    let newStatus;
    if (action === 'checkin') {
      if (currentStatus.rows.length > 0 && currentStatus.rows[0].status === 'Checked In') {
        client.release();
        return res.status(400).json({ success: false, message: 'Already checked in today' });
      }
      newStatus = 'Checked In';
    } else {
      if (currentStatus.rows.length === 0 || currentStatus.rows[0].status === 'Checked Out') {
        client.release();
        return res.status(400).json({ success: false, message: 'Must check in before checking out' });
      }
      newStatus = 'Checked Out';
    }
    
    // Insert attendance record
    await client.query(
      'INSERT INTO attendance (user_id, status, check_time) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      [userId, newStatus]
    );
    
    client.release();
    res.json({ success: true, status: newStatus, message: `Successfully ${action === 'checkin' ? 'checked in' : 'checked out'}` });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance' });
  }
});

// Get attendance history for a user
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT check_time::date as date, status, check_time FROM attendance WHERE user_id = $1 AND check_time >= CURRENT_DATE - INTERVAL \'1 day\' * $2 ORDER BY check_time DESC',
      [userId, days]
    );
    
    client.release();
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
});

module.exports = router; 