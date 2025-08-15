'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { useSession } from 'next-auth/react';

// Función para verificar si Firebase está configurado
const isFirebaseConfigured = () => {
  return !(
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'your-firebase-api-key' ||
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'your-project-id'
  );
};

// Importación condicional de auth
let auth: any = null;
try {
  if (isFirebaseConfigured()) {
    // Usar import dinámico en lugar de require
    import('../../lib/firebase').then((firebaseModule) => {
      auth = firebaseModule.auth;
    }).catch((error) => {
      console.warn('Firebase no está configurado correctamente:', error);
    });
  }
} catch (error) {
  console.warn('Firebase no está configurado correctamente:', error);
}

interface FirebaseAuthContextType {
  firebaseUser: User | null;
  loading: boolean;
  signOutFirebase: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType>({
  firebaseUser: null,
  loading: true,
  signOutFirebase: async () => {}
});

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

export const FirebaseAuthProvider = ({ children }: FirebaseAuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const { data: session } = useSession();

  // Verificar configuración de Firebase en useEffect para evitar hidratación
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setConfigError('Firebase no está configurado correctamente.');
      setLoading(false);
      return;
    }
    
    if (!auth) {
      setConfigError('No se pudo inicializar Firebase Auth.');
      setLoading(false);
      return;
    }
    
    setConfigError(null);
  }, []);

  // Sin cronología de hooks rota: todos los hooks siempre se ejecutan en el mismo orden

  useEffect(() => {
    if (configError || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [configError]);

  // Sincronizar Firebase con NextAuth
  useEffect(() => {
    if (!session && firebaseUser) {
      // Si no hay sesión de NextAuth pero sí usuario de Firebase, cerrar Firebase
      signOut(auth);
    }
  }, [session, firebaseUser]);

  const signOutFirebase = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Error al cerrar sesión de Firebase:', error);
    }
  };

  const value = {
    firebaseUser,
    loading,
    signOutFirebase
  };

  // Definir el valor del contexto y el contenido a renderizar según el estado
  const contextValue = configError
    ? { firebaseUser: null, loading: false, signOutFirebase: async () => {} }
    : value;

  const content = configError ? (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error de Configuración</h2>
        <p className="text-gray-600 mb-4">{configError}</p>
        <p className="text-sm text-gray-500">Contacta al administrador del sistema.</p>
      </div>
    </div>
  ) : (
    children
  );

  // Renderizado condicional del contenido manteniendo el orden de hooks
  const providerValue = configError
    ? { firebaseUser: null, loading: false, signOutFirebase: async () => {} }
    : value;

  return (
    <FirebaseAuthContext.Provider value={providerValue}>
      {configError ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error de Configuración</h2>
            <p className="text-gray-600 mb-4">{configError}</p>
            <p className="text-sm text-gray-500">Contacta al administrador del sistema.</p>
          </div>
        </div>
      ) : (
        children
      )}
    </FirebaseAuthContext.Provider>
  );
};