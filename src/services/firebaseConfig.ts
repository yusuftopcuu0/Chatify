import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQuDNq3GbN2xy1ZA22d535rg5vWMK3-FY",
  authDomain: "chatify-2d4fb.firebaseapp.com",
  projectId: "chatify-2d4fb",
  storageBucket: "chatify-2d4fb.firebasestorage.app",
  messagingSenderId: "135552054096",
  appId: "1:135552054096:web:95f391badaefa10bb9f255",
  measurementId: "G-0C037C1PBW",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
