# 🚀 Quick Vercel Deployment Guide

## Step 1: Database Setup (Railway - Free)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project → "Provision PostgreSQL"
4. Copy the connection details from the "Connect" tab

## Step 2: Deploy Backend

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/nihithkothakota/HRMS`
4. Configure:
   - **Framework Preset**: Node.js
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Output Directory**: `./`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   ```
   DB_HOST=your-railway-host
   DB_PORT=5432
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=your-railway-password
   JWT_SECRET=your-super-secret-key-here
   CLIENT_URL=https://your-frontend-url.vercel.app
   ```

6. Deploy and note the URL (e.g., `https://hrms-backend.vercel.app`)

## Step 3: Deploy Frontend

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import the same repository: `https://github.com/nihithkothakota/HRMS`
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.vercel.app/api
   ```

6. Deploy and note the URL (e.g., `https://hrms-frontend.vercel.app`)

## Step 4: Initialize Database

1. Visit: `https://your-backend-url.vercel.app/api/init-db`
2. This will create all tables and sample data

## Step 5: Test

1. Visit your frontend URL
2. Login with:
   - **Admin**: admin@hrms.com / admin123
   - **Employee**: john.doe@hrms.com / employee123

## 🔧 Troubleshooting

### If you get CORS errors:
1. Go to your backend Vercel project settings
2. Add environment variable: `CLIENT_URL=https://your-frontend-url.vercel.app`

### If database connection fails:
1. Check Railway database is running
2. Verify all database environment variables are correct
3. Test connection at: `https://your-backend-url.vercel.app/api/db-test`

### If frontend can't connect to backend:
1. Verify `REACT_APP_API_URL` is set correctly
2. Check backend is deployed and running
3. Test backend health: `https://your-backend-url.vercel.app/api/health`

## 🎉 Done!

Your HRMS will be live at your frontend URL! 