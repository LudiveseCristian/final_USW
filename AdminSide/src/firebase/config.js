import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBLa7xObhirUoOooKRBG2Kb_5_sFNY4aSo",
  authDomain: "upcycled-streetwear.firebaseapp.com",
  projectId: "upcycled-streetwear",
  storageBucket: "upcycled-streetwear.firebasestorage.app",
  messagingSenderId: "410226515488",
  appId: "1:410226515488:web:3a8bbbaf054bb2eefea645",
  measurementId: "G-QLQY51HR40"
};

const app = initializeApp(firebaseConfig);
// Initialize Analytics only when supported (avoids dev/HMR issues)
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch(() => {
  // no-op if analytics not supported
});

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
