// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // If the user is not logged in, redirect to the login page.
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default PrivateRoute;
