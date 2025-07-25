import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';
import LeaveManagement from './LeaveManagement';
import EmployeeManagement from './EmployeeManagement';
import { API_BASE_URL } from '../config';

const Dashboard = ({ user, onLogout, token }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalEmployees: 0,
      presentToday: 0,
      onLeave: 0,
      payrollDue: 0
    },
    recentActivity: [],
    attendanceStatus: 'Not checked in',
    leaveBalance: {
      annual: 15,
      sick: 10
    },
    salary: {
      basic: 4500,
      allowances: 500,
      total: 5000
    },
    performance: {
      rating: 4.2,
      lastReviewed: '3 months ago'
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to handle API responses
  const handleApiResponse = useCallback(async (response) => {
    if (response.status === 401) {
      // Token is invalid, logout user
      onLogout();
      return null;
    }
    return response.json();
  }, [onLogout]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch recent activity
      const activityResponse = await fetch(`${API_BASE_URL}/dashboard/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Fetch user-specific data
      const userDataResponse = await fetch(`${API_BASE_URL}/dashboard/user-data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const stats = await handleApiResponse(statsResponse);
      const activity = await handleApiResponse(activityResponse);
      const userData = await handleApiResponse(userDataResponse);

      if (stats && activity && userData) {
        setDashboardData(prevDashboardData => ({
          stats: {
            totalEmployees: stats.data?.totalEmployees || 0,
            presentToday: stats.data?.presentToday || 0,
            onLeave: stats.data?.onLeave || 0,
            payrollDue: stats.data?.totalSalary || 0,
            newEmployeesThisMonth: stats.data?.newEmployeesThisMonth || 0
          },
          recentActivity: activity.data || prevDashboardData.recentActivity,
          attendanceStatus: userData.data?.attendanceStatus || prevDashboardData.attendanceStatus,
          leaveBalance: userData.data?.leaveBalance || prevDashboardData.leaveBalance,
          salary: userData.data?.salary || prevDashboardData.salary,
          performance: userData.data?.performance || prevDashboardData.performance
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, handleApiResponse]);

  // Check attendance status
  const checkAttendanceStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(prev => ({
          ...prev,
          attendanceStatus: data.status
        }));
      }
    } catch (error) {
      console.error('Error checking attendance status:', error);
    }
  }, [token]);

  // Check in/out
  const handleAttendance = async (action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(prev => ({
          ...prev,
          attendanceStatus: data.status
        }));
        // Refresh dashboard data
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    checkAttendanceStatus();
    
    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchDashboardData, checkAttendanceStatus]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'attendance', label: 'Attendance', icon: '⏰' },
    { id: 'leave', label: 'Leave Management', icon: '🏖️' },
    { id: 'payroll', label: 'Payroll', icon: '💰' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    ...(user?.role === 'admin' ? [
      { id: 'employees', label: 'Employee Management', icon: '👥' },
      { id: 'reports', label: 'Reports', icon: '📋' }
    ] : [])
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <p>⚠️ {error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab user={user} data={dashboardData} />;
      case 'profile':
        return <ProfileTab user={user} />;
      case 'attendance':
        return <AttendanceTab user={user} data={dashboardData} onAttendance={handleAttendance} />;
      case 'leave':
        return <LeaveTab user={user} data={dashboardData} token={token} />;
      case 'payroll':
        return <PayrollTab user={user} data={dashboardData} />;
      case 'performance':
        return <PerformanceTab user={user} data={dashboardData} token={token} />;
      case 'employees':
        return <EmployeesTab user={user} token={token} />;
      case 'reports':
        return <ReportsTab user={user} token={token} />;
      default:
        return <OverviewTab user={user} data={dashboardData} />;
    }
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3>🚀 HRMS</h3>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            {sidebarOpen ? '🚪 Logout' : '🚪'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="content-header">
          <div className="header-left">
            <h1>{menuItems.find(item => item.id === activeTab)?.label}</h1>
          </div>
          <div className="header-right">
            <span className="current-time">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>

        <main className="content-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// Tab Components
const OverviewTab = ({ user, data }) => (
  <div className="overview-tab">
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <h3>Total Employees</h3>
          <p className="stat-number">{data.stats.totalEmployees}</p>
          <p className={`stat-change ${data.stats.newEmployeesThisMonth > 0 ? 'positive' : 'neutral'}`}>
            {data.stats.newEmployeesThisMonth > 0 
              ? `+${data.stats.newEmployeesThisMonth} this month` 
              : 'No new employees this month'}
          </p>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">⏰</div>
        <div className="stat-content">
          <h3>Present Today</h3>
          <p className="stat-number">{data.stats.presentToday}</p>
          <p className="stat-change positive">
            {data.stats.totalEmployees > 0 ? Math.round((data.stats.presentToday / data.stats.totalEmployees) * 100) : 0}% attendance
          </p>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">🏖️</div>
        <div className="stat-content">
          <h3>On Leave</h3>
          <p className="stat-number">{data.stats.onLeave}</p>
          <p className="stat-change neutral">
            {data.stats.totalEmployees > 0 ? Math.round((data.stats.onLeave / data.stats.totalEmployees) * 100) : 0}% of workforce
          </p>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-content">
          <h3>Payroll Due</h3>
          <p className="stat-number">₹{data.stats.payrollDue.toLocaleString('en-IN')}</p>
          <p className="stat-change positive">Next week</p>
        </div>
      </div>
    </div>

    <div className="recent-activity">
      <h2>Recent Activity</h2>
      <div className="activity-list">
        {data.recentActivity.length > 0 ? (
          data.recentActivity.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <p><strong>{activity.user}</strong> {activity.action}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="activity-item">
            <div className="activity-icon">✅</div>
            <div className="activity-content">
              <p><strong>John Doe</strong> checked in at 9:00 AM</p>
              <span className="activity-time">2 hours ago</span>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ProfileTab = ({ user }) => (
  <div className="profile-tab">
    <div className="profile-header">
      <div className="profile-avatar">
        {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
      </div>
      <div className="profile-info">
        <h2>{user?.first_name} {user?.last_name}</h2>
        <p className="profile-role">{user?.role} • {user?.department}</p>
        <p className="profile-position">{user?.position}</p>
      </div>
    </div>

    <div className="profile-details">
      <div className="detail-section">
        <h3>Personal Information</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <label>Email</label>
            <p>{user?.email}</p>
          </div>
          <div className="detail-item">
            <label>Department</label>
            <p>{user?.department || 'Not assigned'}</p>
          </div>
          <div className="detail-item">
            <label>Position</label>
            <p>{user?.position || 'Not assigned'}</p>
          </div>
          <div className="detail-item">
            <label>Role</label>
            <p className="role-badge">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AttendanceTab = ({ user, data, onAttendance }) => (
  <div className="attendance-tab">
    <div className="attendance-header">
      <h2>Attendance Management</h2>
      <div className="attendance-actions">
        <button 
          className="btn btn-primary" 
          onClick={() => onAttendance('checkin')}
          disabled={data.attendanceStatus === 'Checked In'}
        >
          Check In
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => onAttendance('checkout')}
          disabled={data.attendanceStatus === 'Not checked in'}
        >
          Check Out
        </button>
      </div>
    </div>
    
    <div className="attendance-status">
      <div className="status-card">
        <h3>Today's Status</h3>
        <p className={`status-text ${data.attendanceStatus === 'Checked In' ? 'checked-in' : ''}`}>
          {data.attendanceStatus}
        </p>
        <p className="status-time">Current time: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>

    <div className="attendance-history">
      <h3>This Week's Attendance</h3>
      <div className="attendance-calendar">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="calendar-day">
            <span className="day-name">{day}</span>
            <span className="day-status">-</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LeaveTab = ({ user, data, token }) => (
  <LeaveManagement user={user} token={token} />
);

const PayrollTab = ({ user, data }) => (
  <div className="payroll-tab">
    <h2>Payroll Information</h2>
    <div className="payroll-summary">
      <div className="payroll-card">
        <h3>Current Month</h3>
        <p className="salary-amount">₹{(data.salary?.amount || 0).toLocaleString('en-IN')}</p>
        <p className="salary-period">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
    
    <div className="payroll-details">
      <h3>Salary Breakdown</h3>
      <div className="breakdown-list">
        <div className="breakdown-item">
          <span>Basic Salary</span>
          <span>₹{(data.salary?.amount || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="breakdown-item">
          <span>Allowances</span>
          <span>₹0</span>
        </div>
        <div className="breakdown-item total">
          <span>Total</span>
          <span>₹{(data.salary?.amount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  </div>
);

const PerformanceTab = ({ user, data, token }) => {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Helper function to handle API responses
  const handleApiResponse = async (response) => {
    if (response.status === 401) {
      window.location.reload();
      return null;
    }
    return response.json();
  };

  useEffect(() => {
    fetchReviews();
    if (user.role === 'admin' || user.role === 'manager') {
      fetchEmployees();
    }
    // eslint-disable-next-line
  }, [user.id]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/performance/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await handleApiResponse(response);
      if (result && result.success) {
        setReviews(result.data);
        setError(null); // Clear error if successful
      } else if (result && result.message) {
        setError(result.message);
      } else if (!result) {
        setError('Failed to fetch reviews');
      }
    } catch (err) {
      setError('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/performance/employees/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await handleApiResponse(response);
      if (result && result.success) {
        setEmployees(result.data);
        setError(null); // Clear error if successful
      } else if (result && result.message) {
        setError(result.message);
      } else if (!result) {
        setError('Failed to fetch employees');
      }
    } catch (err) {
      setError('Failed to fetch employees');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setError('Please select an employee to review');
      return;
    }
    
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/performance/${selectedEmployee}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comments })
      });
      const result = await handleApiResponse(response);
      if (result && result.success) {
        setSuccess('Review added successfully!');
        setComments('');
        setRating(5);
        setSelectedEmployee('');
        fetchReviews();
      } else if (result && result.message) {
        setError(result.message || 'Failed to add review');
      } else if (!result) {
        setError('Failed to add review');
      }
    } catch (err) {
      setError('Failed to add review');
    }
  };

  return (
    <div className="performance-tab">
      <h2>Performance Reviews</h2>
      {(user.role === 'admin' || user.role === 'manager') && (
        <div className="performance-form">
          <h3>Add Performance Review</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Employee</label>
              <select 
                value={selectedEmployee} 
                onChange={e => setSelectedEmployee(e.target.value)} 
                required
              >
                <option value="">Choose an employee to review</option>
                {employees && employees.length > 0 && employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} - {emp.position} ({emp.department_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Rating</label>
              <select value={rating} onChange={e => setRating(Number(e.target.value))} required>
                {[5,4,3,2,1].map(val => (
                  <option key={val} value={val}>{val} - {val === 5 ? 'Excellent' : val === 4 ? 'Good' : val === 3 ? 'Average' : val === 2 ? 'Below Average' : 'Poor'}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Comments</label>
              <textarea 
                value={comments} 
                onChange={e => setComments(e.target.value)}
                placeholder="Provide detailed feedback about the employee's performance..."
                rows="4"
              />
            </div>
            <button className="btn btn-primary" type="submit">Submit Review</button>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
          </form>
        </div>
      )}
      <div className="performance-history">
        <h3>Review History</h3>
        {loading ? <p>Loading...</p> : (
          reviews.length === 0 ? <p>No reviews yet.</p> : (
            <ul className="review-list">
              {reviews.map(r => (
                <li key={r.id} className="review-item">
                  <div className="review-header">
                    <span className="rating">Rating: {r.rating}/5</span>
                    <span className="reviewer">By: {r.reviewer_first_name} {r.reviewer_last_name} ({r.reviewer_role})</span>
                    <span className="date">{new Date(r.review_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  {r.comments && <div className="comments">{r.comments}</div>}
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
};

const EmployeesTab = ({ user, token }) => (
  <EmployeeManagement user={user} token={token} />
);

const ReportsTab = ({ user, token }) => {
  const [activeReport, setActiveReport] = useState('analytics');
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    departmentId: '',
    status: ''
  });
  const [departments, setDepartments] = useState([]);

  // Helper function to handle API responses (same as Dashboard)
  const handleApiResponse = async (response) => {
    if (response.status === 401) {
      // Token is invalid, redirect to login
      window.location.reload();
      return null;
    }
    return response.json();
  };

  useEffect(() => {
    fetchDepartments();
    fetchReportData();
  }, );

  const fetchDepartments = useCallback(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/employees/departments/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await handleApiResponse(response);
    if (result && result.success) {
      setDepartments(result.data);
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
  }
}, [token]);


  const fetchReportData = useCallback(async () => {
  setLoading(true);
  try {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
    if (filters.status) queryParams.append('status', filters.status);

    const response = await fetch(`${API_BASE_URL}/reports/${activeReport}?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await handleApiResponse(response);
    if (result && result.success) {
      setReportData(result.data);
    }
  } catch (error) {
    console.error('Error fetching report data:', error);
  } finally {
    setLoading(false);
  }
}, [activeReport, filters, token]);


  const renderReportContent = () => {
    if (loading) {
      return <div className="loading">Loading report data...</div>;
    }

    switch (activeReport) {
      case 'analytics':
        return (
          <div className="analytics-report">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Total Employees</h3>
                <p className="number">{reportData.totalEmployees || 0}</p>
              </div>
              <div className="analytics-card">
                <h3>Present Today</h3>
                <p className="number">{reportData.presentToday || 0}</p>
              </div>
              <div className="analytics-card">
                <h3>On Leave Today</h3>
                <p className="number">{reportData.onLeaveToday || 0}</p>
              </div>
            </div>
            <div className="recent-activities">
              <h3>Recent Activities</h3>
              {reportData.recentActivities && reportData.recentActivities.length > 0 ? (
                <ul className="activity-list">
                  {reportData.recentActivities.map((activity, index) => (
                    <li key={index} className="activity-item">
                      <span className="activity-type">{activity.type}</span>
                      <span className="activity-user">{activity.first_name} {activity.last_name}</span>
                      <span className="activity-action">{activity.action}</span>
                      <span className="activity-time">{new Date(activity.timestamp).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No recent activities</p>
              )}
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="attendance-report">
            <div className="report-filters">
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                placeholder="Start Date"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                placeholder="End Date"
              />
              <select
                value={filters.departmentId}
                onChange={e => setFilters({...filters, departmentId: e.target.value})}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Check-ins</th>
                    <th>Check-outs</th>
                    <th>First Check-in</th>
                    <th>Last Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? reportData.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.first_name} {emp.last_name}</td>
                      <td>{emp.department_name}</td>
                      <td>{emp.check_ins || 0}</td>
                      <td>{emp.check_outs || 0}</td>
                      <td>{emp.first_check_in ? new Date(emp.first_check_in).toLocaleString() : '-'}</td>
                      <td>{emp.last_check_out ? new Date(emp.last_check_out).toLocaleString() : '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6">No attendance data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'payroll':
        return (
          <div className="payroll-report">
            <div className="report-filters">
              <select
                value={filters.departmentId}
                onChange={e => setFilters({...filters, departmentId: e.target.value})}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            {reportData.summary && (
              <div className="payroll-summary">
                <h3>Payroll Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Total Employees:</span>
                    <span>{reportData.summary.totalEmployees}</span>
                  </div>
                  <div className="summary-item">
                    <span>Total Salary:</span>
                    <span>₹{reportData.summary.totalSalary?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="summary-item">
                    <span>Average Salary:</span>
                    <span>₹{reportData.summary.averageSalary?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Salary</th>
                    <th>Years of Service</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? reportData.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.first_name} {emp.last_name}</td>
                      <td>{emp.position}</td>
                      <td>{emp.department_name}</td>
                      <td>₹{parseFloat(emp.salary || 0).toLocaleString('en-IN')}</td>
                      <td>{emp.years_of_service || 0}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5">No payroll data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'departments':
        return (
          <div className="departments-report">
            <div className="report-table">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Employees</th>
                    <th>Active Employees</th>
                    <th>Average Salary</th>
                    <th>Total Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? reportData.map(dept => (
                    <tr key={dept.id}>
                      <td>{dept.name}</td>
                      <td>{dept.description}</td>
                      <td>{dept.employee_count || 0}</td>
                      <td>{dept.active_employees || 0}</td>
                      <td>₹{parseFloat(dept.average_salary || 0).toLocaleString('en-IN')}</td>
                      <td>₹{parseFloat(dept.total_salary || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6">No department data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return <div>Select a report type</div>;
    }
  };

  return (
    <div className="reports-tab">
      <h2>Reports & Analytics</h2>
      <div className="reports-nav">
        <button 
          className={`report-nav-btn ${activeReport === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveReport('analytics')}
        >
          Dashboard Analytics
        </button>
        <button 
          className={`report-nav-btn ${activeReport === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveReport('attendance')}
        >
          Attendance Report
        </button>
        <button 
          className={`report-nav-btn ${activeReport === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveReport('payroll')}
        >
          Payroll Report
        </button>
        <button 
          className={`report-nav-btn ${activeReport === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveReport('departments')}
        >
          Department Summary
        </button>
      </div>
      <div className="report-content">
        {renderReportContent()}
      </div>
    </div>
  );
};

export default Dashboard; 