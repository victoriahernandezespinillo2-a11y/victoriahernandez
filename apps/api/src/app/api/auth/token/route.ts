import { NextRequest, NextResponse } from 'next/server';
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
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
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

// Helper para añadir headers CORS
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  // Lista de orígenes permitidos
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://polideportivo-web.vercel.app',
    'https://polideportivo-admin.vercel.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = NextResponse.json(
        { error: 'No autorizado - Token de Firebase requerido' }, 
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const firebaseIdToken = authHeader.replace('Bearer ', '');
    await ensureFirebaseAdmin();
    const decoded = await firebaseAdmin.verifyIdToken(firebaseIdToken, true);
    
    if (!decoded.email || !decoded.uid) {
      const response = NextResponse.json(
        { error: 'No autorizado - Token de Firebase inválido' }, 
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    let user = await db.user.findFirst({ where: { firebaseUid: decoded.uid } });
    if (!user) {
      user = await db.user.findUnique({ where: { email: decoded.email } });
      if (user) {
        await db.user.update({ where: { id: user.id }, data: { firebaseUid: decoded.uid } });
      } else {
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
      const response = NextResponse.json(
        { error: 'No autorizado - Usuario inactivo' }, 
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está configurado');
      const response = NextResponse.json(
        { error: 'Error de configuración del servidor' }, 
        { status: 500 }
      );
      return addCorsHeaders(response, origin);
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      firebaseUid: user.firebaseUid,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
    };

    const jwtToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
    console.log('✅ [AUTH-TOKEN] JWT generado exitosamente para:', user.email);
    
    const response = NextResponse.json({ 
      token: jwtToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
    return addCorsHeaders(response, origin);

  } catch (error: any) {
    console.error('❌ [AUTH-TOKEN] Error generando JWT:', error);
    
    let errorResponse;
    if (error?.code === 'auth/id-token-expired') {
      errorResponse = NextResponse.json(
        { error: 'No autorizado - Token de Firebase expirado' }, 
        { status: 401 }
      );
    } else if (error?.code === 'auth/id-token-revoked') {
      errorResponse = NextResponse.json(
        { error: 'No autorizado - Token de Firebase revocado' }, 
        { status: 401 }
      );
    } else {
      errorResponse = NextResponse.json(
        { error: 'Error interno del servidor', message: error?.message, code: error?.code }, 
        { status: 500 }
      );
    }
    
    return addCorsHeaders(errorResponse, origin);
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}
