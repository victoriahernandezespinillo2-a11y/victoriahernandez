/**
 * Repository Interface: PromotionRepository
 * Contrato para la persistencia de promociones
 */

import { Promotion } from '../entities/Promotion';

export interface PromotionTransactionContext {
  savePromotion(promotion: Promotion): Promise<void>;
  findApplicationByIdempotencyKey(key: string): Promise<any | null>;
  createApplication(data: {
    promotionId: string;
    userId: string;
    creditsAwarded: number;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<void>;
}

export interface PromotionRepository {
  /**
   * Ejecutar operaciones en una transacción
   */
  transaction<T>(operation: (tx: PromotionTransactionContext) => Promise<T>): Promise<T>;

  /**
   * Encontrar promoción por ID
   */
  findById(id: string): Promise<Promotion | null>;

  /**
   * Encontrar promoción por código
   */
  findByCode(code: string): Promise<Promotion | null>;

  /**
   * Guardar promoción
   */
  savePromotion(promotion: Promotion): Promise<void>;

  /**
   * Encontrar promociones activas
   */
  findActivePromotions(options?: {
    type?: string;
    excludeExhausted?: boolean;
  }): Promise<Promotion[]>;

  /**
   * Encontrar todas las promociones
   */
  findAll(options?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Promotion[]>;

  /**
   * Eliminar promoción
   */
  deletePromotion(id: string): Promise<void>;

  /**
   * Obtener aplicaciones de una promoción
   */
  findApplicationsByPromotionId(promotionId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]>;

  /**
   * Obtener aplicaciones de un usuario
   */
  findApplicationsByUserId(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
}



