const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
// Import database configuration
const { testConnection, initDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leaves');
const performanceRoutes = require('./routes/performance');
const reportsRoutes = require('./routes/reports');

// Import middleware
const authenticateToken = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/reports', reportsRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'HRMS Backend is running!', 
    timestamp: new Date().toISOString(),
    status: 'success'
  });
});

// Health check with database status
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    status: 'healthy',
    database: dbStatus ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Token validation endpoint (requires authentication)
app.get('/api/auth/validate', authenticateToken, (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Token is valid',
    user: req.user
  });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ 
        message: 'Database connection successful!',
        status: 'success'
      });
    } else {
      res.status(500).json({ 
        message: 'Database connection failed!',
        status: 'error'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Database test failed!',
      error: error.message,
      status: 'error'
    });
  }
});

// Initialize database endpoint
app.post('/api/init-db', async (req, res) => {
  try {
    const success = await initDatabase();
    if (success) {
      res.json({ 
        message: 'Database initialized successfully!',
        status: 'success'
      });
    } else {
      res.status(500).json({ 
        message: 'Database initialization failed!',
        status: 'error'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Database initialization failed!',
      error: error.message,
      status: 'error'
    });
  }
});

// Serve React app for all non-API routes (for SPA routing)
const path = require('path');

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  // If the request doesn't start with /api, serve index.html
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
  await initDatabase();
  console.log(`🚀 HRMS Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🗄️ Database test: http://localhost:${PORT}/api/db-test`);
  console.log(`🔐 Auth routes: http://localhost:${PORT}/api/auth`);
  console.log(`📈 Dashboard routes: http://localhost:${PORT}/api/dashboard`);
  console.log(`⏰ Attendance routes: http://localhost:${PORT}/api/attendance`);
  
  // Test database connection on startup
  console.log('\n🔍 Testing database connection...');
  await testConnection();
}); 