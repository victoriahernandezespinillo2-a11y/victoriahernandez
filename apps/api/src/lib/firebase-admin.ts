/**
 * Firebase Admin SDK Configuration
 * Para eliminación completa de usuarios desde el backend
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let firebaseApp: App | null = null;
let firebaseAuth: Auth | null = null;

/**
 * Inicializa Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    let serviceAccount: any;

    // Intentar usar FIREBASE_SERVICE_ACCOUNT_JSON primero (formato completo)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log('Firebase Admin SDK configurado usando FIREBASE_SERVICE_ACCOUNT_JSON');
      } catch (parseError) {
        console.warn('Error parseando FIREBASE_SERVICE_ACCOUNT_JSON:', parseError);
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido');
      }
    } else {
      // Fallback a variables individuales
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        console.warn('Firebase Admin SDK no configurado. Variables de entorno faltantes.');
        throw new Error('Firebase Admin SDK no configurado');
      }
    }

    // Inicializar Firebase Admin
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || serviceAccount.projectId,
    });

    console.log('Firebase Admin SDK inicializado correctamente');
    return firebaseApp;
  } catch (error) {
    console.warn('Error inicializando Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Obtiene la instancia de Firebase Auth
 */
export function getFirebaseAdminAuth(): Auth {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  try {
    const app = initializeFirebaseAdmin();
    firebaseAuth = getAuth(app);
    return firebaseAuth;
  } catch (error) {
    console.warn('Error obteniendo Firebase Auth:', error);
    throw error;
  }
}

/**
 * Elimina un usuario de Firebase Auth
 */
export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  try {
    const auth = getFirebaseAdminAuth();
    await auth.deleteUser(uid);
    console.log(`Usuario ${uid} eliminado de Firebase Auth`);
    return true;
  } catch (error) {
    console.error(`Error eliminando usuario ${uid} de Firebase Auth:`, error);
    return false;
  }
}

/**
 * Verifica si Firebase Admin está configurado
 */
export function isFirebaseAdminConfigured(): boolean {
  try {
    // Verificar si está configurado con FIREBASE_SERVICE_ACCOUNT_JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        return !!(serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email);
      } catch {
        return false;
      }
    }
    
    // Verificar variables individuales como fallback
    return !!(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    );
  } catch {
    return false;
  }
}

export default {
  initializeFirebaseAdmin,
  getFirebaseAdminAuth,
  deleteFirebaseUser,
  isFirebaseAdminConfigured,
};

















