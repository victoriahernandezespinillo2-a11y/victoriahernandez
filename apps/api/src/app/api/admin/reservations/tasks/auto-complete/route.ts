import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { AutoCompleteService } from '@/lib/services/auto-complete.service';

/**
 * GET /api/admin/reservations/tasks/auto-complete
 * Endpoint manual para auto-completar reservas expiradas
 * Útil para testing y casos urgentes
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [MANUAL-AUTO-COMPLETE] Ejecutando auto-completar reservas...');
    
    const result = await AutoCompleteService.autoCompleteExpiredReservations();
    
    return ApiResponse.success({
      message: 'Auto-completar ejecutado exitosamente',
      completed: result.completed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [MANUAL-AUTO-COMPLETE] Error:', error);
    return ApiResponse.internalError('Error ejecutando auto-completar');
  }
}

export async function OPTIONS() { 
  return ApiResponse.success(null); 
}








