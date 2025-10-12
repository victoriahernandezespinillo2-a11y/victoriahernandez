/**
 * Domain Service: CreditCalculationService
 * Lógica de negocio compleja para cálculos de créditos
 */

import { CreditAmount } from '../value-objects/CreditAmount';
import { Promotion } from '../entities/Promotion';
import { ValidationResult } from '../common/ValidationResult';

export interface PaymentSplit {
  creditAmount: CreditAmount;
  cardAmount: CreditAmount;
  totalAmount: CreditAmount;
}

export interface PromotionReward {
  type: 'FIXED_CREDITS' | 'PERCENTAGE_BONUS';
  value: number;
}

export class CreditCalculationService {
  /**
   * Calcular recompensa de promoción
   */
  calculatePromotionReward(
    baseAmount: CreditAmount,
    promotion: Promotion
  ): CreditAmount {
    const reward = promotion.rewards as PromotionReward;
    
    if (reward.type === 'FIXED_CREDITS') {
      return new CreditAmount(reward.value, baseAmount.currency);
    }
    
    if (reward.type === 'PERCENTAGE_BONUS') {
      const bonusAmount = baseAmount.multiply(reward.value / 100);
      return bonusAmount;
    }
    
    throw new Error(`Tipo de recompensa no soportado: ${reward.type}`);
  }

  /**
   * Calcular división de pago mixto
   */
  calculatePaymentSplit(
    totalAmount: CreditAmount,
    availableCredits: CreditAmount,
    maxCreditAmount?: CreditAmount
  ): PaymentSplit {
    const maxCredits = maxCreditAmount || availableCredits;
    
    // Determinar cuánto se puede pagar con créditos
    const creditAmount = this.determineCreditAmount(
      totalAmount,
      availableCredits,
      maxCredits
    );
    
    // El resto se paga con tarjeta
    const cardAmount = totalAmount.subtract(creditAmount);
    
    return {
      creditAmount,
      cardAmount,
      totalAmount
    };
  }

  /**
   * Calcular créditos equivalentes a euros
   */
  calculateCreditsFromEuro(
    euroAmount: CreditAmount,
    euroPerCredit: number
  ): CreditAmount {
    if (euroPerCredit <= 0) {
      throw new Error('El ratio euro por crédito debe ser positivo');
    }
    
    const credits = euroAmount.value / euroPerCredit;
    return new CreditAmount(credits, euroAmount.currency);
  }

  /**
   * Calcular euros equivalentes a créditos
   */
  calculateEuroFromCredits(
    creditAmount: CreditAmount,
    euroPerCredit: number
  ): CreditAmount {
    if (euroPerCredit <= 0) {
      throw new Error('El ratio euro por crédito debe ser positivo');
    }
    
    const euros = creditAmount.value * euroPerCredit;
    return new CreditAmount(euros, creditAmount.currency);
  }

  /**
   * Validar división de pago
   */
  validatePaymentSplit(split: PaymentSplit): ValidationResult {
    const errors: string[] = [];
    
    // Verificar que la suma coincida con el total
    const calculatedTotal = split.creditAmount.add(split.cardAmount);
    if (!calculatedTotal.equals(split.totalAmount)) {
      errors.push('La suma de créditos y tarjeta no coincide con el total');
    }
    
    // Verificar que no haya montos negativos
    if (!split.creditAmount.isPositive() && !split.creditAmount.isZero()) {
      errors.push('La cantidad de créditos no puede ser negativa');
    }
    
    if (!split.cardAmount.isPositive() && !split.cardAmount.isZero()) {
      errors.push('La cantidad de tarjeta no puede ser negativa');
    }
    
    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Determinar la cantidad óptima de créditos a usar
   */
  private determineCreditAmount(
    totalAmount: CreditAmount,
    availableCredits: CreditAmount,
    // minCreditAmount: CreditAmount,
    maxCreditAmount: CreditAmount
  ): CreditAmount {
    // No se puede usar más créditos de los disponibles
    const maxUsable = availableCredits.isLessThan(maxCreditAmount) 
      ? availableCredits 
      : maxCreditAmount;
    
    // No se puede usar menos que el mínimo
    // const minUsable = minCreditAmount.isGreaterThan(maxUsable) 
    //   ? maxUsable 
    //   : minCreditAmount;
    
    // No se puede usar más que el total
    const totalUsable = totalAmount.isLessThan(maxUsable) 
      ? totalAmount 
      : maxUsable;
    
    // Usar el máximo posible respetando todas las restricciones
    return totalUsable;
  }

  /**
   * Calcular descuento por promoción
   */
  calculatePromotionDiscount(
    baseAmount: CreditAmount,
    promotion: Promotion
  ): CreditAmount {
    // const conditions = promotion.conditions as any;
    
    // Verificar si aplica el descuento
    if (!this.isPromotionApplicable(baseAmount, promotion)) {
      return new CreditAmount(0, baseAmount.currency);
    }
    
    const reward = promotion.rewards as PromotionReward;
    
    if (reward.type === 'FIXED_CREDITS') {
      // Descuento fijo en créditos
      return new CreditAmount(reward.value, baseAmount.currency);
    }
    
    if (reward.type === 'PERCENTAGE_BONUS') {
      // Descuento porcentual
      const discountAmount = baseAmount.multiply(reward.value / 100);
      return discountAmount;
    }
    
    return new CreditAmount(0, baseAmount.currency);
  }

  /**
   * Verificar si una promoción es aplicable
   */
  private isPromotionApplicable(
    amount: CreditAmount,
    promotion: Promotion
  ): boolean {
    const conditions = promotion.conditions as any;
    
    // Verificar monto mínimo
    if (conditions.minAmount && amount.value < conditions.minAmount) {
      return false;
    }
    
    // Verificar monto máximo
    if (conditions.maxAmount && amount.value > conditions.maxAmount) {
      return false;
    }
    
    // Verificar fechas de vigencia
    const now = new Date();
    if (promotion.validFrom > now) {
      return false;
    }
    
    if (promotion.validTo && promotion.validTo < now) {
      return false;
    }
    
    // Verificar límite de uso
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return false;
    }
    
    return true;
  }
}
