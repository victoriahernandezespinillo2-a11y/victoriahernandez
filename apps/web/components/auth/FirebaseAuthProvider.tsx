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
  // Guardar la instancia de auth en estado para forzar re-render cuando esté lista
  const [authInstance, setAuthInstance] = useState<any | null>(null);
  const { data: session } = useSession();

  // Cargar Firebase de forma dinámica y segura
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isFirebaseConfigured()) {
        if (!mounted) return;
        setConfigError('Firebase no está configurado correctamente.');
        setLoading(false);
        return;
      }

      try {
        const firebaseModule = await import('../../lib/firebase');
        if (!mounted) return;
        // Usar inicialización perezosa segura para cliente
        const auth = firebaseModule.getFirebaseAuth();
        setAuthInstance(auth);
        setConfigError(null);
      } catch (error) {
        console.warn('Firebase no está configurado correctamente o no se pudo inicializar:', error);
        if (!mounted) return;
        setConfigError('No se pudo inicializar Firebase Auth.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Suscribirse a cambios de autenticación cuando auth esté listo
  useEffect(() => {
    if (configError || !authInstance) {
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, (user: User | null) => {
      setFirebaseUser(user);
    });

    return () => unsubscribe();
  }, [authInstance, configError]);

  const signOutFirebase = async () => {
    try {
      if (authInstance) {
        await signOut(authInstance);
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