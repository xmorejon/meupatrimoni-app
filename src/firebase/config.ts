// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions"; // Import the functions module

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-BAp-Uh3OC7pe4-Mv6ij3lScRl96fDl4",
  authDomain: "meupatrimoni-app.web.app",
  projectId: "meupatrimoni-app",
  storageBucket: "meupatrimoni-app.appspot.com",
  messagingSenderId: "792203456948",
  appId: "1:792203456948:web:3b76693471fbc59ba6c2e1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Set persistence to local storage
setPersistence(auth, browserLocalPersistence);

// Initialize Cloud Functions and point them to the correct region
const functions = getFunctions(app, 'europe-west1');

const getAuthLink = httpsCallable(functions, 'getTrueLayerAuthLink');
const handleCallback = httpsCallable(functions, 'handleTrueLayerCallback');
const importCsv = httpsCallable(functions, 'importCsv');


// Export all the firebase services
export { app, db, auth, functions, getAuthLink, handleCallback, importCsv };
