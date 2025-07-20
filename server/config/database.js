const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hrms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
const initDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Drop existing tables if they exist
    await client.query('DROP TABLE IF EXISTS performance_reviews CASCADE');
    await client.query('DROP TABLE IF EXISTS attendance CASCADE');
    await client.query('DROP TABLE IF EXISTS leaves CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP TABLE IF EXISTS departments CASCADE');
    
    // Create departments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table with enhanced fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'employee',
        department_id INTEGER REFERENCES departments(id),
        position VARCHAR(100),
        hire_date DATE DEFAULT CURRENT_DATE,
        salary DECIMAL(10,2) DEFAULT 0,
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create performance_reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comments TEXT,
        review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'Checked In',
        check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )
    `);

    // Create leaves table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default departments
    await client.query(`
      INSERT INTO departments (name, description) VALUES 
      ('Information Technology', 'Software Development, IT Support, and System Administration'),
      ('Human Resources', 'Recruitment, Employee Relations, and HR Operations'),
      ('Finance & Accounting', 'Financial Planning, Accounting, and Budget Management'),
      ('Sales & Marketing', 'Sales Operations, Digital Marketing, and Brand Management'),
      ('Operations', 'Business Operations, Process Management, and Quality Assurance'),
      ('Customer Support', 'Customer Service, Technical Support, and Client Relations'),
      ('Research & Development', 'Product Development, Innovation, and Technical Research'),
      ('Legal & Compliance', 'Legal Affairs, Regulatory Compliance, and Risk Management'),
      ('Supply Chain', 'Procurement, Logistics, and Inventory Management'),
      ('Product Management', 'Product Strategy, Roadmap Planning, and Market Analysis')
      ON CONFLICT (name) DO NOTHING
    `);

    // Insert default admin user
    const adminPassword = await require('bcryptjs').hash('admin123', 10);
    await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, department_id, position, salary) VALUES 
      ('admin@hrms.com', $1, 'Admin', 'User', 'admin', 1, 'System Administrator', 120000)
      ON CONFLICT (email) DO NOTHING
    `, [adminPassword]);

    // Insert sample employees with realistic data
    const employeePassword = await require('bcryptjs').hash('employee123', 10);
    await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, department_id, position, salary, phone) VALUES 
      ('john.doe@hrms.com', $1, 'John', 'Doe', 'employee', 1, 'Senior Software Engineer', 95000, '+1-555-0101'),
      ('jane.smith@hrms.com', $1, 'Jane', 'Smith', 'employee', 2, 'HR Manager', 85000, '+1-555-0102'),
      ('mike.johnson@hrms.com', $1, 'Mike', 'Johnson', 'employee', 3, 'Senior Accountant', 78000, '+1-555-0103'),
      ('sarah.wilson@hrms.com', $1, 'Sarah', 'Wilson', 'employee', 4, 'Marketing Director', 92000, '+1-555-0104'),
      ('david.brown@hrms.com', $1, 'David', 'Brown', 'employee', 5, 'Operations Manager', 88000, '+1-555-0105'),
      ('emma.davis@hrms.com', $1, 'Emma', 'Davis', 'employee', 6, 'Customer Success Manager', 72000, '+1-555-0106'),
      ('alex.chen@hrms.com', $1, 'Alex', 'Chen', 'employee', 7, 'Product Manager', 95000, '+1-555-0107'),
      ('lisa.garcia@hrms.com', $1, 'Lisa', 'Garcia', 'employee', 8, 'Legal Counsel', 110000, '+1-555-0108'),
      ('robert.taylor@hrms.com', $1, 'Robert', 'Taylor', 'employee', 9, 'Supply Chain Manager', 82000, '+1-555-0109'),
      ('amanda.lee@hrms.com', $1, 'Amanda', 'Lee', 'employee', 10, 'Senior Product Manager', 98000, '+1-555-0110')
      ON CONFLICT (email) DO NOTHING
    `, [employeePassword]);

    console.log('✅ Database tables created successfully with sample data!');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  testConnection,
  initDatabase
}; 