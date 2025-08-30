import { NextRequest, NextResponse } from 'next/server';
import { withPublicMiddleware } from '../../../../lib/middleware';
import * as jwt from 'jsonwebtoken';
import { db } from '@repo/db';

// Inicialización lazy de Firebase Admin
let firebaseAdmin: any = null;
let firebaseInitialized = false;

const ensureFirebaseAdmin = async () => {
  if (firebaseInitialized) return firebaseAdmin;
  
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    
    if (getApps().length === 0) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccount) {
        const parsed = JSON.parse(serviceAccount);
        initializeApp({
          credential: cert(parsed),
          projectId: process.env.FIREBASE_PROJECT_ID || parsed.project_id,
        });
      } else {
        // Fallback para entornos que no tienen service account
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
    }
    
    firebaseAdmin = getAuth();
    firebaseInitialized = true;
    console.log('✅ [FIREBASE-ADMIN] Inicializado correctamente');
  } catch (error) {
    console.error('❌ [FIREBASE-ADMIN] Error de inicialización:', error);
    throw error;
  }
  
  return firebaseAdmin;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  return withPublicMiddleware(async (r) => {
    try {
      // Obtener el Firebase ID Token del header Authorization
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'No autorizado - Token de Firebase requerido' },
          { status: 401 }
        );
      }

      const firebaseIdToken = authHeader.replace('Bearer ', '');
      
      // Verificar el token de Firebase
      await ensureFirebaseAdmin();
      const decoded = await firebaseAdmin.verifyIdToken(firebaseIdToken, true);
      
      if (!decoded.email || !decoded.uid) {
        return NextResponse.json(
          { error: 'No autorizado - Token de Firebase inválido' },
          { status: 401 }
        );
      }

      // Buscar o crear usuario en la base de datos
      let user = await db.user.findFirst({
        where: { firebaseUid: decoded.uid }
      });

      if (!user) {
        // Buscar por email como fallback
        user = await db.user.findUnique({
          where: { email: decoded.email }
        });
        
        if (user) {
          // Actualizar el firebaseUid si no lo tenía
          await db.user.update({
            where: { id: user.id },
            data: { firebaseUid: decoded.uid }
          });
        } else {
          // Crear nuevo usuario
          user = await db.user.create({
            data: {
              email: decoded.email,
              name: decoded.name || decoded.email.split('@')[0],
              firebaseUid: decoded.uid,
              role: 'USER',
              isActive: true,
              emailVerified: decoded.email_verified || false,
              emailVerifiedAt: decoded.email_verified ? new Date() : null,
            }
          });
        }
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: 'No autorizado - Usuario inactivo' },
          { status: 401 }
        );
      }

      // Generar JWT para comunicación cross-domain
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET no está configurado');
        return NextResponse.json(
          { error: 'Error de configuración del servidor' },
          { status: 500 }
        );
      }

      const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        firebaseUid: user.firebaseUid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
      };

      const jwtToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

      console.log('✅ [AUTH-TOKEN] JWT generado exitosamente para:', user.email);
      
      return NextResponse.json({ 
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('❌ [AUTH-TOKEN] Error generando JWT:', error);
      
      if (error?.code === 'auth/id-token-expired') {
        return NextResponse.json(
          { error: 'No autorizado - Token de Firebase expirado' },
          { status: 401 }
        );
      }
      
      if (error?.code === 'auth/id-token-revoked') {
        return NextResponse.json(
          { error: 'No autorizado - Token de Firebase revocado' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  })(req);
}

export const OPTIONS = () => new NextResponse(null, { status: 204 });
