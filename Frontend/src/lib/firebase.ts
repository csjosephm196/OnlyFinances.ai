// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAPw6kln4dapLrUB3QMfWpwV-E7jnleY3s",
    authDomain: "soverigncfo.firebaseapp.com",
    projectId: "soverigncfo",
    storageBucket: "soverigncfo.firebasestorage.app",
    messagingSenderId: "884964125145",
    appId: "1:884964125145:web:bf6e653d5e2a1e19ec91c8",
    measurementId: "G-5NCYXSPSWT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics = null;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Export app instance
export { app, analytics };
