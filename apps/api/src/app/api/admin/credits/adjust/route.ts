/**
 * POST /api/admin/credits/adjust
 * Ajustar balance de créditos manualmente (solo admin)
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const AdjustCreditsSchema = z.object({
  userId: z.string().min(1, 'ID de usuario requerido'),
  amount: z.number().refine(val => val !== 0, {
    message: 'El monto no puede ser cero'
  }),
  reason: z.string().min(3, 'La razón debe tener al menos 3 caracteres'),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      // 1. Validar input
      const body = await req.json();
      console.log('📥 [ADJUST] Body recibido:', body);
      console.log('📥 [ADJUST] Tipo de amount:', typeof body.amount);
      
      const validatedData = AdjustCreditsSchema.parse(body);
      console.log('✅ [ADJUST] Datos validados:', validatedData);

      // 2. Verificar que el usuario existe
      console.log('🔍 [ADJUST] Buscando usuario:', validatedData.userId);
      const user = await db.user.findUnique({
        where: { id: validatedData.userId },
        select: {
          id: true,
          name: true,
          email: true,
          creditsBalance: true
        }
      });
      console.log('👤 [ADJUST] Usuario encontrado:', user ? 'Sí' : 'No');

      if (!user) {
        console.log('❌ [ADJUST] Usuario no encontrado');
        return ApiResponse.notFound('Usuario no encontrado');
      }

      // 3. Obtener información del admin
      const adminUser = (req as any).user;
      console.log('👮 [ADJUST] Admin user:', adminUser ? adminUser.email : 'No autenticado');
      if (!adminUser) {
        console.log('❌ [ADJUST] Admin no autenticado');
        return ApiResponse.unauthorized('Admin no autenticado');
      }

      // 4. Ajustar balance directamente con Prisma (más simple y robusto)
      const previousBalance = Number(user.creditsBalance);
      const newBalance = previousBalance + validatedData.amount;
      console.log('💰 [ADJUST] Balance anterior:', previousBalance);
      console.log('💰 [ADJUST] Ajuste:', validatedData.amount);
      console.log('💰 [ADJUST] Balance nuevo:', newBalance);

      if (newBalance < 0) {
        return ApiResponse.badRequest('Balance insuficiente. El balance no puede ser negativo.');
      }

      // Actualizar balance
      console.log('🔄 [ADJUST] Actualizando balance en DB...');
      await db.user.update({
        where: { id: validatedData.userId },
        data: { creditsBalance: newBalance }
      });
      console.log('✅ [ADJUST] Balance actualizado');

      // Registrar transacción
      console.log('📝 [ADJUST] Registrando transacción...');
      await db.walletLedger.create({
        data: {
          userId: validatedData.userId,
          type: validatedData.amount > 0 ? 'CREDIT' : 'DEBIT',
          reason: 'ADJUST',
          credits: Math.abs(validatedData.amount),
          balanceAfter: newBalance,
          metadata: {
            adminUserId: adminUser.id,
            adminName: adminUser.name,
            notes: validatedData.notes,
            reason: validatedData.reason,
            previousBalance
          },
          idempotencyKey: `ADMIN_ADJUST:${validatedData.userId}:${Date.now()}`
        }
      });
      console.log('✅ [ADJUST] Transacción registrada');

      // 5. Respuesta exitosa
      const responseData = {
        userId: validatedData.userId,
        userName: user.name,
        previousBalance,
        adjustment: validatedData.amount,
        newBalance,
        reason: validatedData.reason,
        adjustedBy: {
          id: adminUser.id,
          name: adminUser.name
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('📤 [ADJUST] Enviando respuesta:', responseData);
      return ApiResponse.success(responseData);

    } catch (error) {
      console.error('💥 [ADJUST] Error en POST /api/admin/credits/adjust:', error);
      console.error('💥 [ADJUST] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('💥 [ADJUST] Error message:', error instanceof Error ? error.message : String(error));
      console.error('💥 [ADJUST] Error name:', error instanceof Error ? error.name : 'Unknown');
      
      if (error instanceof z.ZodError) {
        console.error('💥 [ADJUST] Zod validation error:', error.errors);
        return ApiResponse.badRequest('Datos de entrada inválidos');
      }

      console.error('💥 [ADJUST] Returning internal error');
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}