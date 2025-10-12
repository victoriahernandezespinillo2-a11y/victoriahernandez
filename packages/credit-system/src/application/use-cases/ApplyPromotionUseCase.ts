/**
 * Use Case: ApplyPromotionUseCase
 * Caso de uso para aplicar una promoción
 */

import { Promotion } from '../../domain/entities/Promotion';
import { PromotionApplicationService, PromotionContext } from '../../domain/services/PromotionApplicationService';
import { PromotionRepository } from '../../domain/repositories/PromotionRepository';
import { CreditRepository } from '../../domain/repositories/CreditRepository';
import { EventBus } from '../../domain/events/EventBus';
import { AuditService } from '../../infrastructure/services/AuditService';
import { ValidationResult } from '../../domain/common/ValidationResult';
import { UserId } from '../../domain/value-objects/UserId';
import { CreditAmount } from '../../domain/value-objects/CreditAmount';

export interface ApplyPromotionInput {
  userId: string;
  amount: number;
  currency?: string;
  type: 'TOPUP' | 'RESERVATION' | 'SIGNUP';
  promotionCode?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface ApplyPromotionOutput {
  success: boolean;
  promotionApplied?: {
    id: string;
    name: string;
    rewardAmount: number;
    summary: string;
  };
  totalAmount: number;
  originalAmount: number;
  error?: string;
}

export class ApplyPromotionUseCase {
  private promotionApplicationService: PromotionApplicationService;

  constructor(
    private promotionRepository: PromotionRepository,
    private creditRepository: CreditRepository,
    private eventBus: EventBus,
    private auditService: AuditService
  ) {
    this.promotionApplicationService = new PromotionApplicationService();
  }

  /**
   * Ejecutar el caso de uso
   */
  async execute(input: ApplyPromotionInput): Promise<ApplyPromotionOutput> {
    try {
      // 1. Validar input
      const validation = await this.validateInput(input);
      if (!validation.isValid) {
        return {
          success: false,
          totalAmount: input.amount,
          originalAmount: input.amount,
          error: validation.errors.join(', ')
        };
      }

      // 2. Crear contexto
      const context: PromotionContext = {
        userId: new UserId(input.userId),
        amount: new CreditAmount(input.amount, input.currency || 'EUR'),
        type: input.type,
        metadata: input.metadata
      };

      // 3. Buscar promociones aplicables
      let applicablePromotions: Promotion[];
      
      if (input.promotionCode) {
        // Si hay código, buscar por código
        const promotion = await this.promotionRepository.findByCode(input.promotionCode);
        applicablePromotions = promotion ? [promotion] : [];
      } else {
        // Si no hay código, buscar promociones automáticas
        applicablePromotions = await this.promotionRepository.findActivePromotions({
          type: this.mapContextTypeToPromotionType(input.type)
        });
      }

      // 4. Aplicar mejor promoción
      const result = this.promotionApplicationService.applyBestPromotion(
        applicablePromotions,
        context
      );

      if (!result) {
        return {
          success: true,
          totalAmount: input.amount,
          originalAmount: input.amount
        };
      }

      // 5. Calcular total con promoción
      if (!result.promotion || !result.reward) {
        throw new Error('Promoción o recompensa no válida');
      }
      
      const isDiscount = result.promotion.rewards.type.includes('DISCOUNT');
      const totalAmount = this.promotionApplicationService.calculateTotalWithPromotion(
        context.amount,
        result.reward,
        isDiscount
      );

      // 6. Registrar aplicación de promoción
      await this.promotionRepository.transaction(async (tx) => {
        // Verificar idempotencia
        if (input.idempotencyKey) {
          const existing = await tx.findApplicationByIdempotencyKey(input.idempotencyKey);
          if (existing) {
            return;
          }
        }

        // Incrementar contador de uso
        const updatedPromotion = result.promotion!.incrementUsage();
        await tx.savePromotion(updatedPromotion);

        // Crear registro de aplicación
        await tx.createApplication({
          promotionId: result.promotion!.id,
          userId: input.userId,
          creditsAwarded: result.reward!.value,
          metadata: {
            originalAmount: input.amount,
            totalAmount: totalAmount.value,
            type: input.type,
            ...input.metadata
          },
          idempotencyKey: input.idempotencyKey
        });
      });

      // 7. Emitir evento de dominio
      await this.eventBus.publish({
        type: 'PROMOTION_APPLIED',
        payload: {
          userId: input.userId,
          promotionId: result.promotion!.id,
          promotionName: result.promotion!.name,
          rewardAmount: result.reward!.value,
          type: input.type,
          timestamp: new Date()
        },
        timestamp: new Date(),
        aggregateId: input.userId,
        version: 1
      });

      // 8. Auditoría
      await this.auditService.log({
        action: 'PROMOTION_APPLIED',
        userId: input.userId,
        amount: result.reward!.value,
        metadata: {
          promotionId: result.promotion!.id,
          promotionName: result.promotion!.name,
          type: input.type
        },
        timestamp: new Date()
      });

      // 9. Generar resumen
      const summary = this.promotionApplicationService.generatePromotionSummary(result);

      return {
        success: true,
        promotionApplied: {
          id: result.promotion!.id,
          name: result.promotion!.name,
          rewardAmount: result.reward!.value,
          summary
        },
        totalAmount: totalAmount.value,
        originalAmount: input.amount
      };

    } catch (error) {
      console.error('Error applying promotion:', error);
      return {
        success: false,
        totalAmount: input.amount,
        originalAmount: input.amount,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Validar el input
   */
  private async validateInput(input: ApplyPromotionInput): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validar userId
    if (!input.userId || input.userId.length < 10) {
      errors.push('ID de usuario inválido');
    }

    // Validar amount
    if (!input.amount || input.amount <= 0) {
      errors.push('El monto debe ser positivo');
    }

    // Validar type
    if (!['TOPUP', 'RESERVATION', 'SIGNUP'].includes(input.type)) {
      errors.push('Tipo de transacción inválido');
    }

    // Verificar que el usuario existe
    const userExists = await this.creditRepository.userExists(new UserId(input.userId));
    if (!userExists) {
      errors.push('Usuario no encontrado');
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Mapear tipo de contexto a tipo de promoción
   */
  private mapContextTypeToPromotionType(contextType: string): string | undefined {
    const mapping: Record<string, string> = {
      'SIGNUP': 'SIGNUP_BONUS',
      'TOPUP': 'RECHARGE_BONUS',
      'RESERVATION': 'USAGE_BONUS'
    };
    return mapping[contextType];
  }
}
