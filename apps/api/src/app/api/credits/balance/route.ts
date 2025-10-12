/**
 * GET /api/credits/balance
 * Obtener balance de créditos del usuario autenticado
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCreditSystemService } from '@/lib/services/credit-system.service';
import { db } from '@repo/db';
import { ApiResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    // 1. Autenticación
    const user = await getAuthUser(request);
    if (!user) {
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    // 2. Obtener balance
    const creditSystemService = getCreditSystemService(db);
    const balance = await creditSystemService.getBalance(user.id);

    // 3. Respuesta exitosa
    return ApiResponse.success({
      balance: balance || 0,
      currency: 'EUR',
      userId: user.id
    });

  } catch (error) {
    console.error('Error en GET /api/credits/balance:', error);
    return ApiResponse.internalError('Error interno del servidor');
  }
}
