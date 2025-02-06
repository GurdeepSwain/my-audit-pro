// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
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

// Export the Firebase services you plan to use
export const db = getFirestore(app);
export const auth = getAuth(app);


