// Run this script to create an admin user in Firebase Auth
// Usage: node create-admin-user.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

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
const auth = getAuth(app);

async function createAdminUser() {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@upcycled.com', 
      'admin123'
    );
    console.log('Admin user created successfully:', userCredential.user.email);
    console.log('UID:', userCredential.user.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists');
    } else {
      console.error('Error creating admin user:', error);
    }
  }
}

createAdminUser();
