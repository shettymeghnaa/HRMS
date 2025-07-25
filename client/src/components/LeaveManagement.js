import React, { useState, useEffect } from 'react';
import './LeaveManagement.css';
import { API_BASE_URL } from '../config';

const LeaveManagement = ({ user, token }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaves();
  }, );

  const fetchLeaves = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaves`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        setLeaves(result.data);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/leaves`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestForm)
      });
      const result = await response.json();
      if (result.success) {
        setShowRequestForm(false);
        setRequestForm({ leave_type: '', start_date: '', end_date: '', reason: '' });
        fetchLeaves();
      } else {
        alert(result.message || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      alert('Failed to submit leave request');
    }
  };

  const handleStatusUpdate = async (leaveId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (result.success) {
        fetchLeaves();
      } else {
        alert(result.message || 'Failed to update leave status');
      }
    } catch (error) {
      console.error('Error updating leave status:', error);
      alert('Failed to update leave status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  if (loading) {
    return <div className="loading">Loading leaves...</div>;
  }

  return (
    <div className="leave-management">
      <div className="leave-header">
        <h2>Leave Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowRequestForm(true)}
        >
          Request Leave
        </button>
      </div>

      {showRequestForm && (
        <div className="leave-request-form">
          <h3>Request Leave</h3>
          <form onSubmit={handleRequestSubmit}>
            <div className="form-group">
              <label>Leave Type</label>
              <select
                value={requestForm.leave_type}
                onChange={(e) => setRequestForm({...requestForm, leave_type: e.target.value})}
                required
              >
                <option value="">Select leave type</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={requestForm.start_date}
                onChange={(e) => setRequestForm({...requestForm, start_date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={requestForm.end_date}
                onChange={(e) => setRequestForm({...requestForm, end_date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <textarea
                value={requestForm.reason}
                onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Submit Request</button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowRequestForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="leaves-list">
        <h3>{user.role === 'admin' ? 'All Leave Requests' : 'My Leave Requests'}</h3>
        {leaves.length === 0 ? (
          <p>No leave requests found</p>
        ) : (
          <div className="leaves-grid">
            {leaves.map(leave => (
              <div key={leave.id} className="leave-card">
                <div className="leave-header">
                  <h4>{leave.leave_type}</h4>
                  <span className={`status status-${getStatusColor(leave.status)}`}>
                    {leave.status}
                  </span>
                </div>
                <div className="leave-details">
                  <p><strong>Employee:</strong> {leave.first_name} {leave.last_name}</p>
                  <p><strong>Dates:</strong> {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                  <p><strong>Reason:</strong> {leave.reason}</p>
                  <p><strong>Submitted:</strong> {new Date(leave.created_at).toLocaleDateString()}</p>
                  {leave.approver_first_name && (
                    <p><strong>Approved by:</strong> {leave.approver_first_name} {leave.approver_last_name}</p>
                  )}
                </div>
                {user.role === 'admin' && leave.status === 'pending' && (
                  <div className="leave-actions">
                    <button 
                      className="btn btn-success"
                      onClick={() => handleStatusUpdate(leave.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement; 