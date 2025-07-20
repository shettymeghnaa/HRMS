# 🚀 HRMS Deployment Guide

This guide will help you deploy your HRMS application to Vercel.

## 📋 Prerequisites

1. **GitHub Account** - Your code is already pushed to GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Database** - You'll need a PostgreSQL database (we'll use Railway or Supabase)

## 🗄️ Step 1: Set Up Database

### Option A: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project
4. Add a PostgreSQL database
5. Copy the database connection details

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string

## 🔧 Step 2: Deploy Backend

### 2.1 Prepare Backend Repository
1. Create a new repository for the backend:
   ```bash
   # Create a new directory for backend
   mkdir hrms-backend
   cd hrms-backend
   
   # Copy backend files
   cp -r ../HRMS/server/* .
   
   # Initialize git
   git init
   git add .
   git commit -m "Initial backend commit"
   
   # Create new repository on GitHub and push
   git remote add origin https://github.com/yourusername/hrms-backend.git
   git push -u origin main
   ```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your backend repository
4. Configure the project:
   - **Framework Preset**: Node.js
   - **Root Directory**: `./` (or leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `./` (or leave empty)
   - **Install Command**: `npm install`

### 2.3 Set Environment Variables
In your Vercel project settings, add these environment variables:
```
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=https://your-frontend-url.vercel.app
```

### 2.4 Deploy
Click "Deploy" and wait for the deployment to complete. Note the URL (e.g., `https://hrms-backend.vercel.app`).

## 🎨 Step 3: Deploy Frontend

### 3.1 Prepare Frontend Repository
1. Create a new repository for the frontend:
   ```bash
   # Create a new directory for frontend
   mkdir hrms-frontend
   cd hrms-frontend
   
   # Copy frontend files
   cp -r ../HRMS/client/* .
   
   # Initialize git
   git init
   git add .
   git commit -m "Initial frontend commit"
   
   # Create new repository on GitHub and push
   git remote add origin https://github.com/yourusername/hrms-frontend.git
   git push -u origin main
   ```

### 3.2 Update API Configuration
1. Edit `src/config.js`:
   ```javascript
   const config = {
     development: {
       apiUrl: 'http://localhost:5001/api'
     },
     production: {
       apiUrl: 'https://your-backend-url.vercel.app/api'  // Update this
     }
   };
   ```

### 3.3 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your frontend repository
4. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (or leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

### 3.4 Set Environment Variables
Add this environment variable:
```
REACT_APP_API_URL=https://your-backend-url.vercel.app/api
```

### 3.5 Deploy
Click "Deploy" and wait for the deployment to complete.

## 🔄 Step 4: Update Database Schema

After deployment, you need to initialize your database:

1. Go to your backend URL: `https://your-backend-url.vercel.app/api/init-db`
2. This will create all the necessary tables and sample data

## 🧪 Step 5: Test Your Deployment

1. Visit your frontend URL
2. Try logging in with the default credentials:
   - **Admin**: admin@hrms.com / admin123
   - **Employee**: john.doe@hrms.com / employee123

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your backend has the correct CORS configuration
2. **Database Connection**: Verify your database credentials in Vercel environment variables
3. **API URL**: Ensure the frontend is pointing to the correct backend URL

### Debug Steps:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test API endpoints directly using curl or Postman
4. Check browser console for frontend errors

## 📝 Environment Variables Reference

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hrms_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5001/api
```

## 🎉 Success!

Your HRMS application should now be live and accessible from anywhere in the world!

- **Frontend**: https://your-frontend-url.vercel.app
- **Backend**: https://your-backend-url.vercel.app

## 🔄 Continuous Deployment

Both frontend and backend will automatically redeploy when you push changes to your GitHub repositories.

## 📞 Support

If you encounter any issues:
1. Check the Vercel deployment logs
2. Verify all environment variables are set correctly
3. Test your API endpoints individually
4. Check the browser console for errors 