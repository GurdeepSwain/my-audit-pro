// src/App.js
import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AuditPage from './components/AuditPage';
import DailyAuditForm from './components/DailyAuditForm';
import WeeklyAuditForm from './components/WeeklyAuditForm';
import MonthlyAuditForm from './components/MonthlyAuditForm';
import IssueForm from './components/IssueForm';
import IssuesDashboard from './components/IssuesDashboard';
import EditAuditForm from './components/EditAuditForm';
import EditIssueForm from './components/EditIssueForm';
import RangeAuditDashboard from './components/RangeAuditDashboard';

// We'll remove direct import of LayeredAuditMatrix 
// import LayeredAuditMatrix from './components/LayeredAuditMatrix'; 
// Instead import the new page:
import LayeredMatrixPage from './components/LayeredMatrixPage';

import PrivateRoute from './PrivateRoute';
import { useAuth } from './contexts/AuthContext';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

function App() {
  const { currentUser } = useAuth();

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
          <>
            
            <NavLink style={styles.link} to="/audit">Audit Dashboard</NavLink>
            
            {/* We'll point /matrix to the new LayeredMatrixPage */}
            <NavLink style={styles.link} to="/matrix">Matrix</NavLink>
            <NavLink style={styles.link} to="/daily">Daily Audit</NavLink>
            <NavLink style={styles.link} to="/weekly">Weekly Audit</NavLink>
            <NavLink style={styles.link} to="/monthly">Monthly Audit</NavLink>
            <NavLink style={styles.link} to="/issues">Issues Dashboard</NavLink>
            <NavLink style={styles.link} to="/new-issue">New Issue</NavLink>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </>
        ) : (
          <>
            <NavLink style={styles.link} to="/">Login</NavLink>
            <NavLink style={styles.link} to="/register">Register</NavLink>
          </>
        )}
      </nav>
      <div style={styles.container}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginScreen />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute><AuditPage /></PrivateRoute>} />
          <Route path="/range-audit" element={<PrivateRoute><RangeAuditDashboard /></PrivateRoute>} />
          {/* Instead of LayeredAuditMatrix, we now render the new page */}
          <Route path="/matrix" element={<PrivateRoute><LayeredMatrixPage /></PrivateRoute>} />
          <Route path="/daily" element={<PrivateRoute><DailyAuditForm /></PrivateRoute>} />
          <Route path="/weekly" element={<PrivateRoute><WeeklyAuditForm /></PrivateRoute>} />
          <Route path="/monthly" element={<PrivateRoute><MonthlyAuditForm /></PrivateRoute>} />
          <Route path="/new-issue" element={<PrivateRoute><IssueForm /></PrivateRoute>} />
          <Route path="/issues" element={<PrivateRoute><IssuesDashboard /></PrivateRoute>} />
          <Route path="/edit-audit/:auditId" element={<PrivateRoute><EditAuditForm /></PrivateRoute>} />
          <Route path="/edit-issue/:issueId" element={<PrivateRoute><EditIssueForm /></PrivateRoute>} />
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
    gap: '10px',
    flexWrap: 'wrap',
    overflowX: 'visible'
  },
  link: {
    textDecoration: 'none',
    color: '#007bff'
  },
  container: {
    padding: '20px',
    maxWidth: '100vh',
    margin: 'auto',
    alignItems: 'center',
    justifyContent: 'center'
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
