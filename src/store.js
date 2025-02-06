// src/store.js
import { configureStore } from '@reduxjs/toolkit';

// Create a dummy slice or add your reducers here
// For example, you could add an "auth" reducer later
const store = configureStore({
  reducer: {
    // your reducers go here (e.g., auth: authReducer)
  },
});

export default store;
