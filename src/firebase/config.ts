// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions"; // Import the functions module

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-BAp-Uh3OC7pe4-Mv6ij3lScRl96fDl4",
  authDomain: "meupatrimoni-app.firebaseapp.com",
  projectId: "meupatrimoni-app",
  storageBucket: "meupatrimoni-app.firebasestorage.app",
  messagingSenderId: "792203456948",
  appId: "1:792203456948:web:3b76693471fbc59ba6c2e1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Cloud Functions and point them to the correct region
const functions = getFunctions(app, 'europe-west1');

// Export all the firebase services
export { app, db, auth, functions };
