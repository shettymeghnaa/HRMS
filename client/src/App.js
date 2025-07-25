import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import { API_BASE_URL } from './config';

function App() {
  // Removed unused healthData state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      // Validate token by making a test API call
      fetch(`${API_BASE_URL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      })
      .then(response => {
        if (response.ok) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setToken(savedToken);
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      })
      .catch(error => {
        console.error('Token validation failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      });
    }

    // Test backend connection
    // Test backend connection
    fetch(`${API_BASE_URL}/test`)
      .then(response => response.json())
      .catch(error => {
        console.error('Backend connection failed:', error);
      });
    // Removed unused health check fetch
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
  };

  const handleRegister = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  // Global API response handler for 401 errors
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).then(response => {
        if (response.status === 401 && isAuthenticated) {
          // Token expired or invalid, logout user
          handleLogout();
        }
        return response;
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isAuthenticated]); // Only depends on isAuthenticated

  // Show authentication forms if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="App">
        {showLogin ? (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setShowLogin(false)} 
          />
        ) : (
          <Register 
            onRegister={handleRegister} 
            onSwitchToLogin={() => setShowLogin(true)} 
          />
        )}
      </div>
    );
  }

  // Show dashboard if authenticated
  return (
    <div className="App">
      <Dashboard user={user} onLogout={handleLogout} token={token} />
    </div>
  );
}
export default App;