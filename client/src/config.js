// Configuration for different environments
const config = {
  development: {
    apiUrl: 'http://localhost:5001/api'
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://your-backend-url.vercel.app/api'
  }
};

const environment = process.env.NODE_ENV || 'development';
export const API_BASE_URL = config[environment].apiUrl; 