// src/components/LoginScreen.js
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const LoginScreen = () => {
  // State to store the input values and any error messages.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // useNavigate hook to programmatically navigate to other routes
  const navigate = useNavigate();

  // Handler for form submission
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    try {
      // Attempt to sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      // On success, navigate to the Dashboard (or another protected route)
      navigate('/audit');
    } catch (err) {
      // If an error occurs, display it to the user
      setError(err.message);
    }
  };

  return (
    <div style={componentStyles.card}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={componentStyles.formGroup}>
          <label>Email:</label>
          <input
            type="email"
            style={componentStyles.input}
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={componentStyles.formGroup}>
          <label>Password:</label>
          <input
            type="password"
            style={componentStyles.input}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" style={componentStyles.button}>Login</button>
      </form>
      <div style={{ marginTop: '10px' }}>
        <NavLink to="/register">Don't have an account? Register</NavLink>
      </div>
    </div>
  );
};

const componentStyles = {
  card: {
    maxWidth: '400px',
    margin: 'auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  formGroup: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default LoginScreen;
