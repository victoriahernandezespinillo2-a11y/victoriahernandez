import { db, type PricingRule, type Court, type User } from '@repo/db';
import { z } from 'zod';

// Esquemas de validación
export const CalculatePriceSchema = z.object({
  courtId: z.string().cuid(),
  startTime: z.date(),
  duration: z.number().min(30).max(480), // 30 minutos a 8 horas
  userId: z.string().cuid().optional(),
});

export const CreatePricingRuleSchema = z.object({
  courtId: z.string().cuid(),
  name: z.string().min(1).max(255),
  timeStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  timeEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  daysOfWeek: z.array(z.number().min(1).max(7)),
  seasonStart: z.date().optional(),
  seasonEnd: z.date().optional(),
  priceMultiplier: z.number().min(0.1).max(10),
  memberDiscount: z.number().min(0).max(1),
  isActive: z.boolean().default(true),
});

export type CalculatePriceInput = z.infer<typeof CalculatePriceSchema>;
export type CreatePricingRuleInput = z.infer<typeof CreatePricingRuleSchema>;

export interface PriceCalculation {
  basePrice: number;
  multiplier: number;
  memberDiscount: number;
  subtotal: number;
  discount: number;
  total: number;
  appliedRules: string[];
  breakdown: {
    description: string;
    amount: number;
  }[];
}

export class PricingService {
  /**
   * Calcular precio dinámico para una reserva
   */
  async calculatePrice(input: CalculatePriceInput): Promise<PriceCalculation> {
    const validatedInput = CalculatePriceSchema.parse(input);
    
    // Obtener información de la cancha
    const court = await db.court.findUnique({
      where: { id: validatedInput.courtId },
      include: {
        pricingRules: {
          where: { isActive: true },
          orderBy: { priceMultiplier: 'desc' }, // Aplicar reglas con mayor multiplicador primero
        },
      },
    });
    
    if (!court) {
      throw new Error('Cancha no encontrada');
    }
    
    // Obtener información del usuario si se proporciona
    let user: User | null = null;
    if (validatedInput.userId) {
      user = await db.user.findUnique({
        where: { id: validatedInput.userId },
        include: {
          memberships: {
            where: {
              status: 'active',
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
          },
        },
      });
    }
    
    // Calcular precio base por hora
    const durationInHours = validatedInput.duration / 60;
    const basePrice = Number(court.basePricePerHour) * durationInHours;
    
    // Encontrar reglas de precios aplicables
    const applicableRules = this.findApplicablePricingRules(
      court.pricingRules,
      validatedInput.startTime,
      validatedInput.duration
    );
    
    // Calcular multiplicador final
    let finalMultiplier = 1.0;
    let memberDiscount = 0;
    const appliedRules: string[] = [];
    const breakdown: { description: string; amount: number }[] = [];
    
    // Aplicar reglas de precios
    for (const rule of applicableRules) {
      finalMultiplier *= Number(rule.priceMultiplier);
      appliedRules.push(rule.name);
      
      if (Number(rule.priceMultiplier) !== 1.0) {
        const ruleEffect = basePrice * (Number(rule.priceMultiplier) - 1);
        breakdown.push({
          description: `${rule.name} (${Number(rule.priceMultiplier)}x)`,
          amount: ruleEffect,
        });
      }
      
      // Aplicar descuento de miembro si corresponde
      if (user && this.hasMembership(user) && Number(rule.memberDiscount) > memberDiscount) {
        memberDiscount = Number(rule.memberDiscount);
      }
    }
    
    // Calcular precios
    const subtotal = basePrice * finalMultiplier;
    const discount = subtotal * memberDiscount;
    const total = subtotal - discount;
    
    // Agregar breakdown del precio base
    breakdown.unshift({
      description: `Precio base (${durationInHours}h × €${court.basePricePerHour})`,
      amount: basePrice,
    });
    
    // Agregar descuento de miembro si aplica
    if (discount > 0) {
      breakdown.push({
        description: `Descuento de miembro (${memberDiscount * 100}%)`,
        amount: -discount,
      });
    }
    
    return {
      basePrice,
      multiplier: finalMultiplier,
      memberDiscount,
      subtotal,
      discount,
      total,
      appliedRules,
      breakdown,
    };
  }
  
  /**
   * Encontrar reglas de precios aplicables
   */
  private findApplicablePricingRules(
    rules: PricingRule[],
    startTime: Date,
    duration: number
  ): PricingRule[] {
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const dayOfWeek = startTime.getDay() === 0 ? 7 : startTime.getDay(); // Convertir domingo de 0 a 7
    
    return rules.filter(rule => {
      // Verificar día de la semana
      if (!rule.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
      
      // Verificar temporada
      if (rule.seasonStart && rule.seasonEnd) {
        const currentDate = new Date(startTime);
        currentDate.setHours(0, 0, 0, 0);
        
        if (currentDate < rule.seasonStart || currentDate > rule.seasonEnd) {
          return false;
        }
      }
      
      // Verificar horario
      const ruleStartTime = this.parseTimeString(rule.timeStart);
      const ruleEndTime = this.parseTimeString(rule.timeEnd);
      
      const reservationStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const reservationEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();
      
      // Verificar si hay solapamiento entre el horario de la regla y la reserva
      return (
        reservationStartMinutes < ruleEndTime &&
        reservationEndMinutes > ruleStartTime
      );
    });
  }
  
  /**
   * Convertir string de tiempo (HH:MM) a minutos desde medianoche
   */
  private parseTimeString(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Verificar si el usuario tiene membresía activa
   */
  private hasMembership(user: User & { memberships: any[] }): boolean {
    return user.memberships.length > 0;
  }
  
  /**
   * Crear nueva regla de precios
   */
  async createPricingRule(input: CreatePricingRuleInput): Promise<PricingRule> {
    const validatedInput = CreatePricingRuleSchema.parse(input);
    
    // Verificar que la cancha existe
    const court = await db.court.findUnique({
      where: { id: validatedInput.courtId },
    });
    
    if (!court) {
      throw new Error('Cancha no encontrada');
    }
    
    // Validar que timeEnd > timeStart
    const startMinutes = this.parseTimeString(validatedInput.timeStart);
    const endMinutes = this.parseTimeString(validatedInput.timeEnd);
    
    if (endMinutes <= startMinutes) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }
    
    // Validar fechas de temporada
    if (validatedInput.seasonStart && validatedInput.seasonEnd) {
      if (validatedInput.seasonEnd <= validatedInput.seasonStart) {
        throw new Error('La fecha de fin de temporada debe ser posterior a la fecha de inicio');
      }
    }
    
    return await db.pricingRule.create({
      data: {
        courtId: validatedInput.courtId,
        name: validatedInput.name,
        timeStart: validatedInput.timeStart,
        timeEnd: validatedInput.timeEnd,
        daysOfWeek: validatedInput.daysOfWeek,
        seasonStart: validatedInput.seasonStart,
        seasonEnd: validatedInput.seasonEnd,
        priceMultiplier: validatedInput.priceMultiplier,
        memberDiscount: validatedInput.memberDiscount,
        isActive: validatedInput.isActive,
      },
    });
  }
  
  /**
   * Obtener reglas de precios por cancha
   */
  async getPricingRulesByCourt(courtId: string): Promise<PricingRule[]> {
    return await db.pricingRule.findMany({
      where: { courtId },
      orderBy: [
        { isActive: 'desc' },
        { priceMultiplier: 'desc' },
        { name: 'asc' },
      ],
    });
  }
  
  /**
   * Actualizar regla de precios
   */
  async updatePricingRule(
    id: string,
    input: Partial<CreatePricingRuleInput>
  ): Promise<PricingRule> {
    const existingRule = await db.pricingRule.findUnique({
      where: { id },
    });
    
    if (!existingRule) {
      throw new Error('Regla de precios no encontrada');
    }
    
    // Validar datos si se proporcionan
    if (input.timeStart && input.timeEnd) {
      const startMinutes = this.parseTimeString(input.timeStart);
      const endMinutes = this.parseTimeString(input.timeEnd);
      
      if (endMinutes <= startMinutes) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
    }
    
    if (input.seasonStart && input.seasonEnd) {
      if (input.seasonEnd <= input.seasonStart) {
        throw new Error('La fecha de fin de temporada debe ser posterior a la fecha de inicio');
      }
    }
    
    return await db.pricingRule.update({
      where: { id },
      data: input,
    });
  }
  
  /**
   * Eliminar regla de precios
   */
  async deletePricingRule(id: string): Promise<void> {
    const existingRule = await db.pricingRule.findUnique({
      where: { id },
    });
    
    if (!existingRule) {
      throw new Error('Regla de precios no encontrada');
    }
    
    await db.pricingRule.delete({
      where: { id },
    });
  }
  
  /**
   * Obtener precios para múltiples horarios (útil para mostrar calendario de precios)
   */
  async getBulkPricing(
    courtId: string,
    slots: Array<{ startTime: Date; duration: number }>,
    userId?: string
  ): Promise<Array<{ startTime: Date; duration: number; price: PriceCalculation }>> {
    const results = [];
    
    for (const slot of slots) {
      try {
        const price = await this.calculatePrice({
          courtId,
          startTime: slot.startTime,
          duration: slot.duration,
          userId,
        });
        
        results.push({
          startTime: slot.startTime,
          duration: slot.duration,
          price,
        });
      } catch (error) {
        // Si hay error calculando el precio, omitir este slot
        console.warn(`Error calculando precio para slot ${slot.startTime}: ${error}`);
      }
    }
    
    return results;
  }
  
  /**
   * Obtener estadísticas de precios
   */
  async getPricingStats(courtId: string, startDate: Date, endDate: Date): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalRevenue: number;
    reservationCount: number;
    priceDistribution: Array<{ range: string; count: number }>;
  }> {
    const reservations = await db.reservation.findMany({
      where: {
        courtId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['confirmed', 'completed'] },
      },
      select: {
        totalPrice: true,
      },
    });
    
    if (reservations.length === 0) {
      return {
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalRevenue: 0,
        reservationCount: 0,
        priceDistribution: [],
      };
    }
    
    const prices = reservations.map(r => Number(r.totalPrice));
    const totalRevenue = prices.reduce((sum, price) => sum + price, 0);
    const averagePrice = totalRevenue / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Crear distribución de precios en rangos
    const ranges = [
      { min: 0, max: 20, label: '€0-20' },
      { min: 20, max: 40, label: '€20-40' },
      { min: 40, max: 60, label: '€40-60' },
      { min: 60, max: 80, label: '€60-80' },
      { min: 80, max: Infinity, label: '€80+' },
    ];
    
    const priceDistribution = ranges.map(range => ({
      range: range.label,
      count: prices.filter(price => price >= range.min && price < range.max).length,
    }));
    
    return {
      averagePrice,
      minPrice,
      maxPrice,
      totalRevenue,
      reservationCount: reservations.length,
      priceDistribution,
    };
  }
}

export const pricingService = new PricingService();