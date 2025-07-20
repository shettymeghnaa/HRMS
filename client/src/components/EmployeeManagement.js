import React, { useState, useEffect } from 'react';
import './EmployeeManagement.css';

const EmployeeManagement = ({ user, token }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department_id: '',
    position: '',
    salary: '',
    phone: ''
  });
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department_id: '',
    position: '',
    salary: '',
    phone: ''
  });

  // Helper function to handle API responses
  const handleApiResponse = async (response) => {
    if (response.status === 401) {
      // Token is invalid, redirect to login
      window.location.reload();
      return null;
    }
    return response.json();
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await handleApiResponse(response);
      if (result && result.success) {
        setEmployees(result.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/employees/departments/list', {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingEmployee 
        ? `/api/employees/${editingEmployee.id}`
        : '/api/employees';
      
      const method = editingEmployee ? 'PUT' : 'POST';
      const body = editingEmployee 
        ? { ...formData, password: undefined } // Don't send password on update
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const result = await handleApiResponse(response);
      if (result && result.success) {
        setShowAddForm(false);
        setEditingEmployee(null);
        setFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          department_id: '',
          position: '',
          salary: '',
          phone: ''
        });
        fetchEmployees();
      } else {
        alert(result.message || 'Failed to save employee');
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee');
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    
    // Validate admin password strength
    if (adminFormData.password.length < 8) {
      alert('Admin passwords must be at least 8 characters long');
      return;
    }

    try {
      const response = await fetch('/api/employees/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(adminFormData)
      });
      
      const result = await handleApiResponse(response);
      if (result && result.success) {
        setShowAdminForm(false);
        setAdminFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          department_id: '',
          position: '',
          salary: '',
          phone: ''
        });
        fetchEmployees();
        alert('Admin account created successfully');
      } else {
        alert(result.message || 'Failed to create admin account');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Failed to create admin account');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      password: '',
      first_name: employee.first_name,
      last_name: employee.last_name,
      department_id: employee.department_id || '',
      position: employee.position || '',
      salary: employee.salary || '',
      phone: employee.phone || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await handleApiResponse(response);
      if (result && result.success) {
        fetchEmployees();
      } else {
        alert(result.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      department_id: '',
      position: '',
      salary: '',
      phone: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading employees...</div>;
  }

  return (
    <div className="employee-management">
      <div className="employee-header">
        <h2>Employee Management</h2>
        <div className="button-group">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            Add Employee
          </button>
          {user.role === 'admin' && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowAdminForm(true)}
              style={{ marginLeft: '10px' }}
            >
              Create Admin
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="employee-form">
          <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              {!editingEmployee && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingEmployee}
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  required
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Salary</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingEmployee ? 'Update Employee' : 'Add Employee'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={cancelForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showAdminForm && (
        <div className="employee-form" style={{ border: '2px solid #dc3545', backgroundColor: '#fff5f5' }}>
          <h3 style={{ color: '#dc3545' }}>⚠️ Create Admin Account</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
            <strong>Security Notice:</strong> Admin accounts have full system access. Only create admin accounts for trusted personnel.
          </p>
          <form onSubmit={handleAdminSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={adminFormData.first_name}
                  onChange={(e) => setAdminFormData({...adminFormData, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={adminFormData.last_name}
                  onChange={(e) => setAdminFormData({...adminFormData, last_name: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password (min 8 characters)</label>
                <input
                  type="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})}
                  required
                  minLength="8"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <select
                  value={adminFormData.department_id}
                  onChange={(e) => setAdminFormData({...adminFormData, department_id: e.target.value})}
                  required
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  value={adminFormData.position}
                  onChange={(e) => setAdminFormData({...adminFormData, position: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Salary</label>
                <input
                  type="number"
                  value={adminFormData.salary}
                  onChange={(e) => setAdminFormData({...adminFormData, salary: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={adminFormData.phone}
                  onChange={(e) => setAdminFormData({...adminFormData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-danger">
                Create Admin Account
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAdminForm(false);
                  setAdminFormData({
                    email: '',
                    password: '',
                    first_name: '',
                    last_name: '',
                    department_id: '',
                    position: '',
                    salary: '',
                    phone: ''
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="employees-list">
        <h3>All Employees</h3>
        {employees.length === 0 ? (
          <p>No employees found</p>
        ) : (
          <div className="employees-grid">
            {employees.map(employee => (
              <div key={employee.id} className="employee-card">
                <div className="employee-header">
                  <h4>{employee.first_name} {employee.last_name}</h4>
                  <span className="employee-role">{employee.role}</span>
                </div>
                <div className="employee-details">
                  <p><strong>Email:</strong> {employee.email}</p>
                  <p><strong>Position:</strong> {employee.position}</p>
                  <p><strong>Department:</strong> {employee.department_name || 'Not assigned'}</p>
                  <p><strong>Salary:</strong> ₹{parseFloat(employee.salary || 0).toLocaleString('en-IN')}</p>
                  <p><strong>Hire Date:</strong> {new Date(employee.hire_date).toLocaleDateString()}</p>
                  {employee.phone && <p><strong>Phone:</strong> {employee.phone}</p>}
                </div>
                <div className="employee-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleEdit(employee)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(employee.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement; 