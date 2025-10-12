/**
 * Domain Service: PromotionApplicationService
 * Lógica de negocio para aplicar promociones
 */

import { Promotion, PromotionType } from '../entities/Promotion';
import { CreditAmount } from '../value-objects/CreditAmount';
import { UserId } from '../value-objects/UserId';
import { ValidationResult } from '../common/ValidationResult';

export interface PromotionContext {
  userId: UserId;
  amount: CreditAmount;
  type: 'TOPUP' | 'RESERVATION' | 'SIGNUP';
  metadata?: Record<string, any>;
}

export interface PromotionApplicationResult {
  promotion: Promotion | null;
  reward: CreditAmount | null;
  applied: boolean;
  reason?: string;
}

export class PromotionApplicationService {
  /**
   * Encontrar promociones aplicables
   */
  findApplicablePromotions(
    promotions: Promotion[],
    context: PromotionContext
  ): Promotion[] {
    return promotions.filter(promotion => {
      // Verificar si está activa
      if (!promotion.isActive()) {
        return false;
      }

      // Verificar tipo de promoción según contexto
      if (!this.matchesContext(promotion, context)) {
        return false;
      }

      // Verificar condiciones específicas
      if (!promotion.canApplyTo(context.amount)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Aplicar mejor promoción
   */
  applyBestPromotion(
    promotions: Promotion[],
    context: PromotionContext
  ): PromotionApplicationResult | null {
    const applicable = this.findApplicablePromotions(promotions, context);

    if (applicable.length === 0) {
      return null;
    }

    // Calcular recompensa para cada promoción
    const results = applicable.map(promotion => ({
      promotion,
      reward: promotion.calculateReward(context.amount)
    }));

    // Ordenar por recompensa (mayor primero)
    results.sort((a, b) => b.reward.value - a.reward.value);

    // Retornar la mejor
    const best = results[0];
    if (!best) {
      return {
        promotion: null,
        reward: null,
        applied: false
      };
    }
    
    return {
      promotion: best.promotion,
      reward: best.reward,
      applied: true
    };
  }

  /**
   * Aplicar múltiples promociones (stackable)
   */
  applyStackablePromotions(
    promotions: Promotion[],
    context: PromotionContext
  ): PromotionApplicationResult[] {
    const applicable = this.findApplicablePromotions(promotions, context);

    // Filtrar solo promociones stackables
    const stackable = applicable.filter(p => p.rewards.stackable);

    return stackable.map(promotion => ({
      promotion,
      reward: promotion.calculateReward(context.amount),
      applied: true
    }));
  }

  /**
   * Validar código promocional
   */
  async validatePromotionCode(
    code: string,
    promotions: Promotion[],
    context: PromotionContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Buscar promoción por código
    const promotion = promotions.find(p => p.code?.toUpperCase() === code.toUpperCase());

    if (!promotion) {
      errors.push('Código promocional no válido');
      return new ValidationResult(false, errors);
    }

    // Verificar si está activa
    if (!promotion.isActive()) {
      errors.push('La promoción ha expirado o no está activa');
      return new ValidationResult(false, errors);
    }

    // Verificar si se puede aplicar
      if (!promotion.canApplyTo(context.amount)) {
      errors.push('La promoción no se puede aplicar a esta transacción');
      return new ValidationResult(false, errors);
    }

    return new ValidationResult(true);
  }

  /**
   * Verificar si la promoción coincide con el contexto
   */
  private matchesContext(promotion: Promotion, context: PromotionContext): boolean {
    switch (promotion.type) {
      case PromotionType.SIGNUP_BONUS:
        return context.type === 'SIGNUP';

      case PromotionType.RECHARGE_BONUS:
        return context.type === 'TOPUP';

      case PromotionType.USAGE_BONUS:
        return context.type === 'RESERVATION';

      case PromotionType.DISCOUNT_CODE:
        // Los códigos de descuento pueden aplicarse a cualquier contexto
        return true;

      case PromotionType.SEASONAL:
        // Las promociones estacionales pueden aplicarse a cualquier contexto
        return true;

      default:
        return false;
    }
  }

  /**
   * Calcular total con promoción
   */
  calculateTotalWithPromotion(
    originalAmount: CreditAmount,
    promotionReward: CreditAmount,
    isDiscount: boolean = false
  ): CreditAmount {
    if (isDiscount) {
      // Si es descuento, restar del total
      return originalAmount.subtract(promotionReward);
    } else {
      // Si es bonus, agregar al total
      return originalAmount.add(promotionReward);
    }
  }

  /**
   * Generar resumen de promoción aplicada
   */
  generatePromotionSummary(result: PromotionApplicationResult): string {
    const { promotion, reward } = result;

    if (!promotion || !reward) {
      return 'Sin promociones aplicables';
    }

    switch (promotion.rewards.type) {
      case 'FIXED_CREDITS':
        return `${promotion.name}: +${reward.format()} de bonus`;

      case 'PERCENTAGE_BONUS':
        return `${promotion.name}: +${promotion.rewards.value}% de bonus (${reward.format()})`;

      case 'DISCOUNT_PERCENTAGE':
        return `${promotion.name}: ${promotion.rewards.value}% de descuento (${reward.format()})`;

      case 'DISCOUNT_FIXED':
        return `${promotion.name}: ${reward.format()} de descuento`;

      default:
        return `${promotion.name}: ${reward.format()}`;
    }
  }
}
