// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, firestore } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc }      from 'firebase/firestore';

// Create a context for authentication
const AuthContext = createContext();

// Provider component that wraps your app and makes auth object available
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole]       = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
const unsubscribe = onAuthStateChanged(auth, async (user) => {
  setCurrentUser(user);
  setLoadingRole(true);

  if (user) {
    try {
      // pull role from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      setUserRole(userDoc.data()?.role || 'user');
    } catch {
      setUserRole('user');
    }
    setLoadingRole(false);
  } else {
    setUserRole(null);
    setLoadingRole(false);
  }

  setLoading(false);
  });

    // Clean up the subscription when the component unmounts
    return unsubscribe;
  }, []);

  // The context value includes the current user and any auth functions you want to expose
  const value = { currentUser, userRole, loadingRole };
     return (
    <AuthContext.Provider value={value}>
       {(!loading && !loadingRole) 
          ? children 
          : <div>Loading auth…</div>}
       </AuthContext.Provider>
  );
}

// Hook to use auth context easily
export function useAuth() {
  return useContext(AuthContext);
}
