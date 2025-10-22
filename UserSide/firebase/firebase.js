// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLa7xObhirUoOooKRBG2Kb_5_sFNY4aSo",
  authDomain: "upcycled-streetwear.firebaseapp.com",
  projectId: "upcycled-streetwear",
  storageBucket: "upcycled-streetwear.firebasestorage.app",
  messagingSenderId: "410226515488",
  appId: "1:410226515488:web:3a8bbbaf054bb2eefea645",
  measurementId: "G-QLQY51HR40"
};

// Initialize Firebase app (check if already initialized to avoid errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with proper persistence handling
let auth;
if (getApps().length === 1) {
  // First time initialization - use initializeAuth with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} else {
  // Already initialized - get existing instance
  auth = getAuth(app);
}

// Initialize other services
export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };