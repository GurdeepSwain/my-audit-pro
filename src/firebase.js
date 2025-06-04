// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Replace the following config object with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUPtMLi4Gw7oYk5ptmujmJHi_zTsyA9Zc",
  authDomain: "wfc-audit-pro.firebaseapp.com",
  projectId: "wfc-audit-pro",
  storageBucket: "wfc-audit-pro.firebasestorage.app",
  messagingSenderId: "573784566982",
  appId: "1:573784566982:web:ff30a88b6d3828c495bbc7"
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
export const firestore = getFirestore(app);


