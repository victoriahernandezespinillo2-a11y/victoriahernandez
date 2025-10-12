/**
 * GET /api/credits/can-afford
 * Verificar si el usuario puede permitirse una cantidad de créditos
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

    // 2. Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get('amount') || '0');

    if (amount <= 0) {
      return ApiResponse.badRequest('El monto debe ser positivo');
    }

    // 3. Verificar si puede permitirse la cantidad
    const creditSystemService = getCreditSystemService(db);
    const canAfford = await creditSystemService.canAfford(user.id, amount);
    const currentBalance = await creditSystemService.getBalance(user.id);

    // 4. Respuesta exitosa
    return ApiResponse.success({
      canAfford,
      amount,
      currentBalance: currentBalance || 0,
      currency: 'EUR',
      userId: user.id
    });

  } catch (error) {
    console.error('Error en GET /api/credits/can-afford:', error);
    return ApiResponse.internalError('Error interno del servidor');
  }
}
