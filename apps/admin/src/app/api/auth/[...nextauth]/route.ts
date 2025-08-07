import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'admin@polideportivo.com'
        },
        password: {
          label: 'Contraseña',
          type: 'password'
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Usuarios de prueba para desarrollo
        const testUsers = [
          {
            id: '1',
            email: 'admin@polideportivo.com',
            password: 'admin123',
            name: 'Administrador Principal',
            role: 'ADMIN',
          },
          {
            id: '2',
            email: 'superadmin@polideportivo.com',
            password: 'super123',
            name: 'Super Administrador',
            role: 'SUPER_ADMIN',
          }
        ];

        const user = testUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        return null;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.accessToken = token.accessToken;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Para credenciales, permitir login y verificar rol después
      if (account?.provider === 'credentials') {
        return true;
      }
      
      // Para Google OAuth, verificar dominio autorizado
      if (account?.provider === 'google') {
        const authorizedEmails = [
          'admin@polideportivo.com',
          'superadmin@polideportivo.com'
        ];
        if (authorizedEmails.includes(user.email || '')) {
          // Asignar rol de admin para emails autorizados
          user.role = 'ADMIN';
          return true;
        }
        return false;
      }
      
      return true;
    },
  },
  debug: false, // Deshabilitado para evitar conflictos con rutas de logging
});

export { handler as GET, handler as POST };