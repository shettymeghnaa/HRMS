const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/database');

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get total employees
    const employeesResult = await client.query(
      'SELECT COUNT(*) as total FROM users WHERE role != $1',
      ['admin']
    );
    
    // Get new employees this month
    const newEmployeesResult = await client.query(`
      SELECT COUNT(*) as new_this_month 
      FROM users 
      WHERE role != 'admin' 
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    // Get present today (checked in today)
    const presentResult = await client.query(`
      SELECT COUNT(DISTINCT user_id) as present 
      FROM attendance 
      WHERE check_time::date = CURRENT_DATE AND status = 'Checked In'
    `);
    
    // Get on leave today
    const onLeaveResult = await client.query(`
      SELECT COUNT(DISTINCT user_id) as on_leave 
      FROM leaves 
      WHERE status = 'approved' 
      AND CURRENT_DATE BETWEEN start_date AND end_date
    `);
    
    // Get total salary (for admin only)
    let totalSalary = 0;
    if (req.user.role === 'admin') {
      const salaryResult = await client.query(`
        SELECT COALESCE(SUM(salary), 0) as total_salary 
        FROM users 
        WHERE role != 'admin' AND is_active = true
      `);
      totalSalary = parseFloat(salaryResult.rows[0].total_salary);
    }
    
    // Get pending leave requests (for admin only)
    let pendingLeaves = 0;
    if (req.user.role === 'admin') {
      const pendingResult = await client.query(`
        SELECT COUNT(*) as pending 
        FROM leaves 
        WHERE status = 'pending'
      `);
      pendingLeaves = parseInt(pendingResult.rows[0].pending);
    }
    
    const stats = {
      totalEmployees: parseInt(employeesResult.rows[0].total),
      presentToday: parseInt(presentResult.rows[0].present),
      onLeave: parseInt(onLeaveResult.rows[0].on_leave),
      totalSalary: totalSalary,
      pendingLeaves: pendingLeaves,
      newEmployeesThisMonth: parseInt(newEmployeesResult.rows[0].new_this_month)
    };
    
    client.release();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent activity
router.get('/activity', auth, async (req, res) => {
  try {
    const client = await pool.connect();
    const activities = [];
    
    // Get recent attendance activities
    const attendanceResult = await client.query(`
      SELECT a.check_time, a.status, u.first_name, u.last_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.check_time >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY a.check_time DESC
      LIMIT 10
    `);
    
    // Get recent leave activities
    const leaveResult = await client.query(`
      SELECT l.created_at, l.status, l.leave_type, u.first_name, u.last_name
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY l.created_at DESC
      LIMIT 10
    `);
    
    // Combine and format activities
    attendanceResult.rows.forEach(att => {
      activities.push({
        user: `${att.first_name} ${att.last_name}`,
        action: `${att.status.toLowerCase()} at ${new Date(att.check_time).toLocaleTimeString()}`,
        time: getTimeAgo(att.check_time),
        icon: att.status === 'Checked In' ? '✅' : '🚪',
        type: 'attendance'
      });
    });
    
    leaveResult.rows.forEach(leave => {
      activities.push({
        user: `${leave.first_name} ${leave.last_name}`,
        action: `${leave.status} ${leave.leave_type} request`,
        time: getTimeAgo(leave.created_at),
        icon: leave.status === 'approved' ? '✅' : leave.status === 'rejected' ? '❌' : '⏳',
        type: 'leave'
      });
    });
    
    // Sort by time and limit to 15 most recent
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    activities.splice(15);
    
    client.release();
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
});

// Get user-specific dashboard data
router.get('/user-data', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await pool.connect();
    
    // Get user's attendance status
    const attendanceResult = await client.query(
      'SELECT status FROM attendance WHERE user_id = $1 AND check_time::date = CURRENT_DATE ORDER BY check_time DESC LIMIT 1',
      [userId]
    );
    
    const attendanceStatus = attendanceResult.rows.length > 0 ? attendanceResult.rows[0].status : 'Not checked in';
    
    // Get user's leave statistics
    const leaveStats = await client.query(`
      SELECT 
        COUNT(*) as total_leaves,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_leaves,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_leaves
      FROM leaves 
      WHERE user_id = $1
    `, [userId]);
    
    // Get user's salary info
    const userInfo = await client.query(`
      SELECT salary, hire_date, position, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [userId]);
    
    const userData = {
      attendanceStatus,
      leaveBalance: {
        total: parseInt(leaveStats.rows[0].total_leaves),
        approved: parseInt(leaveStats.rows[0].approved_leaves),
        pending: parseInt(leaveStats.rows[0].pending_leaves)
      },
      salary: {
        amount: parseFloat(userInfo.rows[0].salary || 0),
        currency: 'USD'
      },
      position: userInfo.rows[0].position,
      department: userInfo.rows[0].department_name,
      hireDate: userInfo.rows[0].hire_date
    };
    
    client.release();
    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user data' });
  }
});

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
}

module.exports = router; 