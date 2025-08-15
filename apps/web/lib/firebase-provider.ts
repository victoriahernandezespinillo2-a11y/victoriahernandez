import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, UserCredential } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// Tipos para Firebase Auth
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Función para iniciar sesión con email y contraseña
export const signInWithFirebase = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  } catch (error: any) {
    throw new Error(error.message || 'Error al iniciar sesión');
  }
};

// Función para registrar usuario con email y contraseña
export const signUpWithFirebase = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  } catch (error: any) {
    throw new Error(error.message || 'Error al registrar usuario');
  }
};

// Función para iniciar sesión con Google
export const signInWithGoogleFirebase = async (): Promise<FirebaseUser> => {
  try {
    const userCredential: UserCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  } catch (error: any) {
    throw new Error(error.message || 'Error al iniciar sesión con Google');
  }
};

// Función para cerrar sesión
export const signOutFirebase = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (error: any) {
    throw new Error(error.message || 'Error al cerrar sesión');
  }
};

// Hook para obtener el usuario actual de Firebase
export const getCurrentFirebaseUser = () => {
  return auth.currentUser;
};