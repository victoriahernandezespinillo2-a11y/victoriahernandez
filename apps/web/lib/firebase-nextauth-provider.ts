import { CredentialsConfig } from 'next-auth/providers/credentials';
import { GoogleProfile } from 'next-auth/providers/google';
import { signInWithFirebase, signInWithGoogleFirebase, signUpWithFirebase } from './firebase-provider';
import { z } from 'zod';

// Schema de validación para credenciales
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.enum(['signin', 'signup']).optional().default('signin')
});

// Proveedor de credenciales con Firebase
export const FirebaseCredentialsProvider: CredentialsConfig = {
  id: 'firebase-credentials',
  name: 'Firebase Credentials',
  type: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
    action: { label: 'Action', type: 'text' }
  },
  async authorize(credentials) {
    try {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const validatedCredentials = credentialsSchema.parse(credentials);
      const { email, password, action } = validatedCredentials;

      let firebaseUser;
      
      if (action === 'signup') {
        // Registrar nuevo usuario en Firebase
        firebaseUser = await signUpWithFirebase(email, password);
      } else {
        // Iniciar sesión con Firebase
        firebaseUser = await signInWithFirebase(email, password);
      }

      if (!firebaseUser) {
        return null;
      }

      // Sincronizar con la base de datos local
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/firebase-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          image: firebaseUser.photoURL,
          action
        }),
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar usuario');
      }

      const userData = await response.json();

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        role: userData.role,
        membershipType: userData.membershipType,
        creditsBalance: userData.creditsBalance,
        firebaseUid: firebaseUser.uid
      };
    } catch (error) {
      console.error('Error en Firebase Credentials Provider:', error);
      return null;
    }
  },
};

// NOTA: FirebaseGoogleProvider eliminado porque causaba conflictos.
// El proveedor estándar de Google de NextAuth ya está configurado en packages/auth/src/providers.ts
// y funciona correctamente sin necesidad de sincronización adicional con Firebase.