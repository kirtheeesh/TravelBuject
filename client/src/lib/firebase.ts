// Firebase configuration - using blueprint guidance
import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

console.log("Firebase env vars check:", {
  hasApiKey: !!apiKey,
  hasProjectId: !!projectId,
  hasAppId: !!appId,
});

const firebaseConfig = {
  apiKey: apiKey || "",
  authDomain: projectId ? `${projectId}.firebaseapp.com` : "",
  projectId: projectId || "",
  storageBucket: projectId ? `${projectId}.appspot.com` : "",
  appId: appId || "",
};

// Initialize Firebase with error handling
let app: any;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseInitialized = false;

try {
  if (apiKey && projectId && appId) {
    console.log("Initializing Firebase with config:", { projectId, authDomain: firebaseConfig.authDomain });
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
  } else {
    console.warn("⚠️ Firebase configuration is incomplete. Using explore mode only.");
    console.warn("Missing:", { apiKey: !apiKey, projectId: !projectId, appId: !appId });
  }
} catch (error: any) {
  console.error("❌ Firebase initialization error:", error.message, error.code);
  console.error("Error details:", error);
}

export { app, auth, db, isFirebaseInitialized };
