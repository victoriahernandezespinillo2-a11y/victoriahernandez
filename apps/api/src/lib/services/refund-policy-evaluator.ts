export type RefundPolicy = 'flexible' | 'moderate' | 'strict';

export interface RefundEvaluationInput {
  centerSettings: any;
  reservationStartTime: Date;
  cancellationTime: Date;
}

export interface RefundEvaluationResult {
  eligible: boolean;
  policyUsed: RefundPolicy;
  deadlineHoursUsed: number;
  reason?: string;
}

/**
 * Evalúa si una cancelación tiene derecho a reembolso automático en créditos
 * usando la política del centro y sus parámetros.
 */
export function evaluateAutoCreditRefund(input: RefundEvaluationInput): RefundEvaluationResult {
  const { centerSettings, reservationStartTime, cancellationTime } = input;

  const paymentsCfg: any = (centerSettings?.payments as any) || {};
  const businessCfg: any = (centerSettings?.business as any) || {};

  const policy: RefundPolicy = (paymentsCfg.refundPolicy as RefundPolicy) || 'moderate';

  // Determinar umbral de horas según política, con fallbacks razonables
  let deadlineHours = 0;
  switch (policy) {
    case 'flexible':
      // Usa refundDeadlineHours si está definido, si no cancellationHours, si no 24h
      deadlineHours = numberOrFallback(paymentsCfg.refundDeadlineHours, numberOrFallback(businessCfg.cancellationHours, 24));
      break;
    case 'moderate':
      // Usa refundDeadlineHours si está definido, si no 48h
      deadlineHours = numberOrFallback(paymentsCfg.refundDeadlineHours, 48);
      break;
    case 'strict':
      deadlineHours = 0; // Nunca reembolsa automáticamente
      break;
    default:
      deadlineHours = numberOrFallback(paymentsCfg.refundDeadlineHours, 48);
  }

  if (!(reservationStartTime instanceof Date) || isNaN(reservationStartTime.getTime())) {
    return { eligible: false, policyUsed: policy, deadlineHoursUsed: deadlineHours, reason: 'Fecha de inicio inválida' };
  }
  if (!(cancellationTime instanceof Date) || isNaN(cancellationTime.getTime())) {
    return { eligible: false, policyUsed: policy, deadlineHoursUsed: deadlineHours, reason: 'Fecha de cancelación inválida' };
  }

  // Si se cancela después del inicio, no hay reembolso
  if (cancellationTime >= reservationStartTime) {
    return { eligible: false, policyUsed: policy, deadlineHoursUsed: deadlineHours, reason: 'Cancelación posterior al inicio' };
  }

  const msDiff = reservationStartTime.getTime() - cancellationTime.getTime();
  const hoursBeforeStart = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60)));

  if (policy === 'strict') {
    return { eligible: false, policyUsed: policy, deadlineHoursUsed: deadlineHours, reason: 'Política estricta: sin reembolsos automáticos' };
  }

  const eligible = hoursBeforeStart >= deadlineHours;
  return {
    eligible,
    policyUsed: policy,
    deadlineHoursUsed: deadlineHours,
    reason: eligible ? undefined : `Cancelación fuera de plazo de reembolso (${hoursBeforeStart}h < ${deadlineHours}h)`,
  };
}

function numberOrFallback(value: any, fallback: number): number {
  const n = typeof value === 'number' ? value : undefined;
  return n != null && !isNaN(n) && n >= 0 ? n : fallback;
}