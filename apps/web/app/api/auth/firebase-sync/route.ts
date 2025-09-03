import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@repo/auth';

const prisma = new PrismaClient();

// Schema de validación
const syncSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  action: z.enum(['signin', 'signup'])
});

// Función para determinar el rol basado en el email
function determineUserRole(email: string): 'ADMIN' | 'STAFF' | 'USER' {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  const staffDomains = process.env.STAFF_DOMAINS?.split(',') || [];
  
  if (adminEmails.includes(email)) {
    return 'ADMIN';
  }
  
  const domain = email.split('@')[1];
  if (domain && staffDomains.includes(domain)) {
    return 'STAFF';
  }
  
  return 'USER';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = syncSchema.parse(body);
    
    const { firebaseUid, email, name, image, action } = validatedData;

    // Buscar usuario existente por email o firebaseUid
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { firebaseUid }
        ]
      }
    });

    if (existingUser) {
      // Usuario existe, actualizar firebaseUid si es necesario
      if (!existingUser.firebaseUid) {
        existingUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firebaseUid,
            name: name || existingUser.name,
            avatar: image || existingUser.avatar,
            lastLoginAt: new Date()
          }
        });
      } else {
        // Solo actualizar última conexión
        existingUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            lastLoginAt: new Date()
          }
        });
      }

      return NextResponse.json({
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        image: existingUser.avatar,
        role: existingUser.role,
        membershipType: existingUser.membershipType,
        creditsBalance: existingUser.creditsBalance
      });
    }

    // Usuario no existe, crear nuevo
    if (action === 'signup' || action === 'signin') {
      const role = determineUserRole(email);
      
      // Generar contraseña temporal para usuarios de Firebase
      const tempPassword = await hashPassword(firebaseUid);
      
      const newUser = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar: image,
          firebaseUid,
          password: tempPassword, // Contraseña temporal basada en firebaseUid
          role,
          membershipType: 'basic',
          creditsBalance: 0,
          isActive: true,
          emailVerified: true, // Firebase ya verifica el email
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date()
        }
      });

      // TODO: Registrar evento de seguridad cuando se implemente el modelo SecurityEvent
      console.log('SECURITY_EVENT:', {
        type: 'LOGIN_SUCCESS',
        userId: newUser.id,
        method: 'firebase',
        provider: action === 'signup' ? 'firebase-signup' : 'firebase-signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.avatar,
        role: newUser.role,
        membershipType: newUser.membershipType,
        creditsBalance: newUser.creditsBalance
      });
    }

    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error en firebase-sync:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}