
# 🏢 HRMS - Human Resource Management System

A comprehensive, modern HRMS built with React frontend and Node.js backend, featuring role-based access control, real-time data, and industry-standard functionality.

## ✨ Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control** (Admin, Manager, Employee)
- **Secure password hashing** with bcryptjs
- **Session management** with automatic token refresh

### 👥 Employee Management
- **Complete CRUD operations** for employee management
- **Realistic industry departments** with detailed descriptions
- **Comprehensive employee profiles** with contact information
- **Department assignment** with dropdown selection
- **Salary management** in Indian Rupees (₹)
- **Employee status tracking** (active/inactive)

### ⏰ Attendance Management
- **Check-in/Check-out functionality** with timestamps
- **Real-time attendance status** display
- **Attendance history** tracking
- **Weekly attendance calendar** view
- **Attendance reports** with filtering options

### 🏖️ Leave Management
- **Leave request submission** with multiple leave types
- **Approval workflow** for managers/admins
- **Leave status tracking** (pending/approved/rejected)
- **Leave balance tracking**
- **Leave history** and reporting

### 📈 Performance Management
- **Employee performance reviews** with 1-5 rating system
- **Review submission** by admins/managers
- **Employee selection** for review assignment
- **Performance history** tracking
- **Detailed feedback** with comments
- **Performance analytics** and reporting

### 💰 Payroll Management
- **Salary information** display in Indian Rupees
- **Salary breakdown** (basic, allowances, total)
- **Payroll reports** with department filtering
- **Salary analytics** (total, average, min, max)
- **Years of service** calculation

### 📊 Comprehensive Reports & Analytics
- **Dashboard Analytics**: Real-time overview with key metrics
- **Attendance Reports**: Detailed attendance tracking with date filters
- **Payroll Reports**: Salary analysis with department summaries
- **Department Reports**: Department-wise employee and salary analytics
- **Performance Reports**: Employee performance tracking and analysis
- **Recent Activities**: Real-time activity feed

### 🎨 Modern UI/UX
- **Responsive design** for all devices
- **Clean, professional interface** with modern styling
- **Intuitive navigation** with sidebar menu
- **Real-time data updates** without page refresh
- **Loading states** and error handling
- **Success/error notifications**

## 🏗️ Architecture

### Frontend (React)
- **React 18** with functional components and hooks
- **Modern CSS** with responsive design
- **State management** with React hooks
- **API integration** with fetch API
- **Role-based UI rendering**

### Backend (Node.js)
- **Express.js** REST API
- **PostgreSQL** database with connection pooling
- **JWT authentication** middleware
- **Role-based authorization** middleware
- **Comprehensive error handling**

### Database Schema
- **Users**: Employee profiles with role-based access
- **Departments**: Organizational structure
- **Attendance**: Check-in/out records
- **Leaves**: Leave requests and approvals
- **Performance Reviews**: Employee performance tracking

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HRMS
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment example
   cp env.example .env
   
   # Configure your database settings
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hrms_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb hrms_db
   
   # Initialize database (run from server directory)
   cd server
   npm start
   ```

5. **Start the application**
   ```bash
   # Start backend server (port 5001)
   cd server
   npm start
   
   # Start frontend server (port 3000)
   cd client
   npm start
   ```

## 🔑 Default Login Credentials

### Admin Access
- **Email**: admin@hrms.com
- **Password**: admin123

### Sample Employee
- **Email**: john.doe@hrms.com
- **Password**: employee123

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/activity` - Recent activities
- `GET /api/dashboard/user-data` - User-specific data

### Employees
- `GET /api/employees` - Get all employees (Admin)
- `POST /api/employees` - Create employee (Admin)
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee (Admin)
- `GET /api/employees/departments/list` - Get departments

### Attendance
- `GET /api/attendance/status` - Get attendance status
- `POST /api/attendance/check` - Check in/out

### Leaves
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Submit leave request
- `PUT /api/leaves/:id/approve` - Approve/reject leave

### Performance
- `GET /api/performance/employees/list` - Get employees for review
- `POST /api/performance/:employeeId` - Add performance review
- `GET /api/performance/:employeeId` - Get employee reviews

### Reports
- `GET /api/reports/analytics` - Dashboard analytics
- `GET /api/reports/attendance` - Attendance reports
- `GET /api/reports/payroll` - Payroll reports
- `GET /api/reports/departments` - Department reports
- `GET /api/reports/performance` - Performance reports

## 🏭 Industry-Standard Departments

The system includes realistic industry departments:

1. **Information Technology** - Software Development, IT Support, System Administration
2. **Human Resources** - Recruitment, Employee Relations, HR Operations
3. **Finance & Accounting** - Financial Planning, Accounting, Budget Management
4. **Sales & Marketing** - Sales Operations, Digital Marketing, Brand Management
5. **Operations** - Business Operations, Process Management, Quality Assurance
6. **Customer Support** - Customer Service, Technical Support, Client Relations
7. **Research & Development** - Product Development, Innovation, Technical Research
8. **Legal & Compliance** - Legal Affairs, Regulatory Compliance, Risk Management
9. **Supply Chain** - Procurement, Logistics, Inventory Management
10. **Product Management** - Product Strategy, Roadmap Planning, Market Analysis

## 💡 Key Features Highlights

### Performance Reviews
- **Employee Selection**: Admins/managers can select specific employees to review
- **Rating System**: 1-5 scale with descriptive labels (Excellent, Good, Average, etc.)
- **Detailed Feedback**: Comprehensive comment system for performance feedback
- **Review History**: Complete audit trail of all performance reviews

### Reports System
- **Real-time Analytics**: Live dashboard with key metrics
- **Filterable Reports**: Date ranges, departments, and status filters
- **Export-Ready Data**: Structured data for external analysis
- **Visual Summaries**: Charts and summaries for quick insights

### Currency Support
- **Indian Rupees**: All salary and financial data displayed in ₹
- **Proper Formatting**: Indian number formatting (e.g., 1,00,000)
- **Consistent Display**: Unified currency display across all modules

## 🔧 Customization

### Adding New Departments
Edit `server/config/database.js` and add new departments to the initialization query.

### Modifying Roles
Update the role-based middleware in route files to add new roles.

### Custom Fields
Extend the database schema and update corresponding API endpoints.

## 🛡️ Security Features

- **JWT Token Authentication**
- **Password Hashing** with bcryptjs
- **Role-based Access Control**
- **Input Validation** and sanitization
- **SQL Injection Prevention** with parameterized queries
- **CORS Configuration** for cross-origin requests

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Deploy to your preferred hosting service (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the React application: `npm run build`
2. Deploy the build folder to your hosting service
3. Configure API endpoint URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**Built with ❤️ for modern HR management** 

