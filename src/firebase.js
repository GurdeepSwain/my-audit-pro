// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Replace the following config object with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBKmWUeAGUltwOK90ZWvrpZquey7EhDSCc",
    authDomain: "my-audit-pro.firebaseapp.com",
    projectId: "my-audit-pro",
    storageBucket: "my-audit-pro.firebasestorage.app",
    messagingSenderId: "814649704328",
    appId: "1:814649704328:web:6bd654421d22f3952d043d",
    measurementId: "G-T8LFKM8MM3"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Set persistence to session only.
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log('Session persistence set to browser session.');
  })
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Export the Firebase services you plan to use
export const db = getFirestore(app);
export {auth};


