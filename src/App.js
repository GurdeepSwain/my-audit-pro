// src/App.js
import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DailyAuditEntry from './components/DailyAuditEntry';
import WeeklyAuditEntry from './components/WeeklyAuditEntry';
import PrivateRoute from './PrivateRoute';

// Import the authentication context and Firebase auth methods
import { useAuth } from './contexts/AuthContext';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

function App() {
  const { currentUser } = useAuth();

  // Logout handler: sign the user out using Firebase's signOut method
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div>
      <nav style={styles.nav}>
        {currentUser ? (
          // If the user is logged in, show the protected links and a Logout button
          <>
            <NavLink style={styles.link} to="/dashboard">Dashboard</NavLink>
            <NavLink style={styles.link} to="/daily-audit">Daily Audit</NavLink>
            <NavLink style={styles.link} to="/weekly-audit">Weekly Audit</NavLink>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </>
        ) : (
          // If no user is logged in, show the public routes: Login and Register
          <>
            <NavLink style={styles.link} to="/">Login</NavLink>
            <NavLink style={styles.link} to="/register">Register</NavLink>
          </>
        )}
      </nav>
      <div style={styles.container}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LoginScreen />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/daily-audit"
            element={
              <PrivateRoute>
                <DailyAuditEntry />
              </PrivateRoute>
            }
          />
          <Route
            path="/weekly-audit"
            element={
              <PrivateRoute>
                <WeeklyAuditEntry />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

const styles = {
  nav: {
    padding: '10px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  link: {
    textDecoration: 'none',
    color: '#007bff'
  },
  container: {
    padding: '20px',
    maxWidth: '960px',
    margin: 'auto'
  },
  logoutButton: {
    padding: '5px 10px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default App;
