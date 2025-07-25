// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_fXQsse-BkGCPTLyZnz9E3aygALM-MxE",
  authDomain: "studentmarks-ddc52.firebaseapp.com",
  projectId: "studentmarks-ddc52",
  storageBucket: "studentmarks-ddc52.firebasestorage.app",
  messagingSenderId: "178721977958",
  appId: "1:178721977958:web:064ff12c2f04541e59dfa7",
  measurementId: "G-9Y7ZPJPXGQ"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
