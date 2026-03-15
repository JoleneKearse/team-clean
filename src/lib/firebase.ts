import { initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY as
    | string
    | undefined,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as
    | string
    | undefined,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID as
    | string
    | undefined,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as
    | string
    | undefined,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID as
    | string
    | undefined,
};

const missingFirebaseEnvVars = (
  Object.entries(firebaseEnv) as Array<[string, string | undefined]>
)
  .filter(([, value]) => !value || value.trim().length === 0)
  .map(([name]) => name);

export const firebaseConfigError =
  missingFirebaseEnvVars.length > 0
    ? `Missing Firebase environment variables: ${missingFirebaseEnvVars.join(", ")}. Add them to your .env file and restart the app.`
    : null;

let db: Firestore | null = null;

if (!firebaseConfigError) {
  const firebaseConfig = {
    apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
    authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
    storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseEnv.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  // Keep the app running with local state and show a clear configuration error.
  console.error(`[firebase] ${firebaseConfigError}`);
}

export { db };
