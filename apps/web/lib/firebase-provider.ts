import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, type UserCredential } from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from './firebase';

// Tipos para Firebase Auth
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Función para iniciar sesión con email y contraseña en Firebase
export const signInWithFirebase = async (email: string, password: string): Promise<FirebaseUser> => {
  const auth = getFirebaseAuth();
  const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
};

// Función para registrar usuario en Firebase
export const signUpWithFirebase = async (email: string, password: string): Promise<FirebaseUser> => {
  const auth = getFirebaseAuth();
  const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
};

// Función para iniciar sesión con Google
export const signInWithGoogleFirebase = async (): Promise<FirebaseUser> => {
  const auth = getFirebaseAuth();
  const googleProvider = getGoogleProvider();
  const userCredential: UserCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
};