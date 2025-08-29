import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

// Configuración de Firebase (valores inyectados en build por Next)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

// Lazy initializer para Firebase App (evita inicializar en SSR y múltiples inicializaciones)
export const getFirebaseApp = (): FirebaseApp => {
  // Firebase App solo debe usarse en el navegador
  if (typeof window === 'undefined') {
    // En SSR/Edge no necesitamos inicializar Firebase Web SDK
    throw new Error('Firebase Web SDK solo disponible en el navegador');
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig as any);
};

// Obtiene (perezosamente) la instancia de Auth
export const getFirebaseAuth = (): Auth => {
  // Si se llama en SSR, propagamos error controlado para que los callers manejen fallback
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth solo disponible en el navegador');
  }
  const app = getFirebaseApp();
  return getAuth(app);
};

// Crea un proveedor de Google con parámetros por defecto
export const getGoogleProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

export default getFirebaseApp;