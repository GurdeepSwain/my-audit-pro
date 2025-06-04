// src/components/RequireAdmin.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RequireAdmin({ children }) {
  const { currentUser, userRole, loadingRole } = useAuth();

  // while we’re fetching the role, don’t flash the redirect:
  if (loadingRole) return <div>Loading…</div>;

  if (!currentUser) {
    // not logged in → back to login
    return <Navigate to="/" replace />;
  }

  if (userRole !== 'admin') {
    // logged in but not an admin → back to user dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
