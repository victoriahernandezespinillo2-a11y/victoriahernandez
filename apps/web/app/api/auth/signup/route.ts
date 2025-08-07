import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, UserRole } from '@repo/db';
import { hashPassword } from '@repo/auth';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

// Schema de validación para el registro
const signupSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  acceptTerms: z.boolean().refine(val => val === true, 'Debes aceptar los términos y condiciones')
});

export async function POST(request: NextRequest) {
  console.log('=== ENDPOINT SIGNUP LLAMADO ===');
  
  try {
    // Parsear el cuerpo de la petición
    const body = await request.json();
    console.log('📝 Datos recibidos:', body);

    // Validar los datos
    const validatedData = signupSchema.parse(body);
    console.log('✅ Datos validados correctamente');

    // Verificar si el usuario ya existe
    const existingUser = await db.findUserByEmail(validatedData.email);

    if (existingUser) {
      console.log('❌ Usuario ya existe');
      return NextResponse.json({
        success: false,
        message: 'El usuario ya existe con este email'
      }, { status: 400 });
    }

    console.log('✅ Usuario no existe, procediendo con el registro');

    // Hash de la contraseña
    const hashedPassword = await hashPassword(validatedData.password);
    console.log('✅ Hash de contraseña generado');

    // Crear el nuevo usuario
    const newUser = await db.createUser({
      name: `${validatedData.firstName} ${validatedData.lastName}`,
      email: validatedData.email,
      phone: validatedData.phone || null,
      password: hashedPassword,
      role: UserRole.user,
      dateOfBirth: null,
      membershipType: null,
      membershipExpiresAt: null,
      creditsBalance: 0,
      isActive: true,
      gdprConsent: validatedData.acceptTerms,
      gdprConsentDate: new Date()
    });

    console.log('✅ [SIGNUP] Usuario creado exitosamente:', newUser.id);

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('=== ERROR EN REGISTRO ===');
    console.error('Tipo de error:', typeof error);
    console.error('Error completo:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    
    if (error instanceof z.ZodError) {
      console.error('Error de validación Zod:', error.errors);
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}