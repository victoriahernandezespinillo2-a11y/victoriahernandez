/**
 * Repository Implementation: PrismaPromotionRepository
 * Implementación de PromotionRepository usando Prisma
 */

import { PromotionRepository, PromotionTransactionContext } from '../../domain/repositories/PromotionRepository';
import { Promotion } from '../../domain/entities/Promotion';
import { PrismaClient } from '@repo/db';

export class PrismaPromotionRepository implements PromotionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Ejecutar operaciones en una transacción
   */
  async transaction<T>(operation: (tx: PromotionTransactionContext) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(async (prismaTx) => {
      const context = new PrismaPromotionTransactionContext(prismaTx);
      return await operation(context);
    });
  }

  /**
   * Encontrar promoción por ID
   */
  async findById(id: string): Promise<Promotion | null> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id }
    });

    if (!promotion) {
      return null;
    }

    return Promotion.fromPersistence(promotion);
  }

  /**
   * Encontrar promoción por código
   */
  async findByCode(code: string): Promise<Promotion | null> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!promotion) {
      return null;
    }

    return Promotion.fromPersistence(promotion);
  }

  /**
   * Guardar promoción
   */
  async savePromotion(promotion: Promotion): Promise<void> {
    const data = promotion.toPersistence();
    
    await this.prisma.promotion.upsert({
      where: { id: data.id },
      create: data,
      update: {
        name: data.name,
        code: data.code,
        status: data.status,
        conditions: data.conditions,
        rewards: data.rewards,
        validFrom: data.validFrom,
        validTo: data.validTo,
        usageLimit: data.usageLimit,
        usageCount: data.usageCount,
        updatedAt: data.updatedAt
      }
    });
  }

  /**
   * Encontrar promociones activas
   */
  async findActivePromotions(options?: {
    type?: string;
    excludeExhausted?: boolean;
  }): Promise<Promotion[]> {
    const now = new Date();
    
    const promotions = await this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ],
        ...(options?.type && { type: options.type as any }),
        ...(options?.excludeExhausted && {
          OR: [
            { usageLimit: null },
            { usageCount: { lt: this.prisma.promotion.fields.usageLimit } }
          ]
        })
      },
      orderBy: { createdAt: 'desc' }
    });

    return promotions.map(p => Promotion.fromPersistence(p));
  }

  /**
   * Encontrar todas las promociones
   */
  async findAll(options?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Promotion[]> {
    const { status, type, limit = 100, offset = 0 } = options || {};

    const promotions = await this.prisma.promotion.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(type && { type: type as any })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return promotions.map(p => Promotion.fromPersistence(p));
  }

  /**
   * Eliminar promoción
   */
  async deletePromotion(id: string): Promise<void> {
    await this.prisma.promotion.delete({
      where: { id }
    });
  }

  /**
   * Obtener aplicaciones de una promoción
   */
  async findApplicationsByPromotionId(promotionId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { limit = 50, offset = 0 } = options || {};

    return await this.prisma.promotionApplication.findMany({
      where: { promotionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { appliedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Obtener aplicaciones de un usuario
   */
  async findApplicationsByUserId(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { limit = 50, offset = 0 } = options || {};

    return await this.prisma.promotionApplication.findMany({
      where: { userId },
      include: {
        promotion: true
      },
      orderBy: { appliedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }
}

/**
 * Contexto de transacción para Prisma
 */
class PrismaPromotionTransactionContext implements PromotionTransactionContext {
  constructor(private prismaTx: any) {}

  async savePromotion(promotion: Promotion): Promise<void> {
    const data = promotion.toPersistence();
    
    await this.prismaTx.promotion.upsert({
      where: { id: data.id },
      create: data,
      update: {
        name: data.name,
        code: data.code,
        status: data.status,
        conditions: data.conditions,
        rewards: data.rewards,
        validFrom: data.validFrom,
        validTo: data.validTo,
        usageLimit: data.usageLimit,
        usageCount: data.usageCount,
        updatedAt: data.updatedAt
      }
    });
  }

  async findApplicationByIdempotencyKey(key: string): Promise<any | null> {
    return await this.prismaTx.promotionApplication.findFirst({
      where: { idempotencyKey: key }
    });
  }

  async createApplication(data: {
    promotionId: string;
    userId: string;
    creditsAwarded: number;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<void> {
    await this.prismaTx.promotionApplication.create({
      data: {
        id: `promo_app_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        promotionId: data.promotionId,
        userId: data.userId,
        creditsAwarded: data.creditsAwarded,
        metadata: data.metadata || {},
        idempotencyKey: data.idempotencyKey,
        appliedAt: new Date()
      }
    });
  }
}
