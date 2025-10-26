/**
 * Constantes compartidas - Frontend Admin
 * Estas constantes deben mantenerse sincronizadas con el backend
 * para garantizar validación consistente
 */

// ============================================
// CONSTANTES DE OVERRIDE DE PRECIOS
// ============================================

/**
 * Porcentaje máximo permitido para override de precios
 * IMPORTANTE: Esta constante debe coincidir con MAX_OVERRIDE_PERCENT en el backend
 * Ubicación backend: apps/api/src/lib/validators/reservation.validator.ts
 */
export const MAX_OVERRIDE_PERCENT = 20;

/**
 * Límites absolutos para override de precios (en euros)
 * IMPORTANTE: Estas constantes deben coincidir con el backend
 */
export const MAX_OVERRIDE_ABSOLUTE = 100000;
export const MIN_OVERRIDE_ABSOLUTE = -100000;

/**
 * Valida que un override de precio esté dentro de los límites permitidos
 * Esta función replica la lógica del backend para validación en tiempo real
 * @param overrideAmount Monto del override (puede ser positivo o negativo)
 * @param basePrice Precio base de la reserva
 * @returns Objeto con resultado de validación y mensaje de error si aplica
 */
export function validatePriceOverride(
  overrideAmount: number,
  basePrice: number
): { 
  isValid: boolean; 
  error?: string;
  details?: {
    overrideAmount: number;
    basePrice: number;
    maxAllowed: number;
    percentageApplied: number;
  }
} {
  // Validar que los valores sean números finitos
  if (!Number.isFinite(overrideAmount) || !Number.isFinite(basePrice)) {
    return {
      isValid: false,
      error: 'Los valores de override y precio base deben ser números válidos'
    };
  }

  // Validar límites absolutos
  if (overrideAmount > MAX_OVERRIDE_ABSOLUTE || overrideAmount < MIN_OVERRIDE_ABSOLUTE) {
    return {
      isValid: false,
      error: `El override debe estar entre ${MIN_OVERRIDE_ABSOLUTE}€ y ${MAX_OVERRIDE_ABSOLUTE}€`
    };
  }

  // Validar límite porcentual
  const maxAllowed = (basePrice * MAX_OVERRIDE_PERCENT) / 100;
  const absoluteOverride = Math.abs(overrideAmount);
  
  if (absoluteOverride > maxAllowed) {
    const percentageApplied = (absoluteOverride / basePrice) * 100;
    return {
      isValid: false,
      error: `El override de ${overrideAmount.toFixed(2)}€ (${percentageApplied.toFixed(1)}%) excede el límite permitido de ${MAX_OVERRIDE_PERCENT}% (${maxAllowed.toFixed(2)}€)`,
      details: {
        overrideAmount,
        basePrice,
        maxAllowed,
        percentageApplied
      }
    };
  }

  return { 
    isValid: true,
    details: {
      overrideAmount,
      basePrice,
      maxAllowed,
      percentageApplied: (absoluteOverride / basePrice) * 100
    }
  };
}

