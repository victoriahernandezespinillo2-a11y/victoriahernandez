/**
 * GET /api/credits/transactions
 * Obtener historial de transacciones de créditos del usuario
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
    const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;

    // 3. Obtener transacciones
    const creditSystemService = getCreditSystemService(db);
    const transactions = await creditSystemService.getTransactionHistory(user.id, {
      limit,
      offset,
      fromDate,
      toDate
    });

    // 4. Transformar transacciones para el frontend
    const transformedTransactions = transactions.map((tx: any) => ({
      id: tx.id.value,
      type: tx.type,
      amount: tx.amount.value,
      reason: tx.reason,
      balanceAfter: tx.balanceAfter.value,
      createdAt: tx.createdAt.toISOString(),
      referenceId: tx.referenceId,
      metadata: tx.metadata
    }));

    // 5. Respuesta exitosa
    return ApiResponse.success({
      transactions: transformedTransactions,
      pagination: {
        limit,
        offset,
        total: transformedTransactions.length,
        hasMore: transformedTransactions.length === limit
      }
    });

  } catch (error) {
    console.error('Error en GET /api/credits/transactions:', error);
    return ApiResponse.internalError('Error interno del servidor');
  }
}
