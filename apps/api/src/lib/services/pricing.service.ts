import { db, type PricingRule, type Court, type User } from '@repo/db';
import { ReservationStatus } from '@prisma/client';
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
  taxRate?: number;
  taxAmount?: number;
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
        center: { select: { settings: true } },
        pricingRules: {
          where: { isActive: true },
          orderBy: [ { name: 'asc' as any } ],
          select: {
            id: true,
            name: true,
            isActive: true,
            // Seleccionar solo JSON para evitar columnas ausentes en DB antiguas
            conditions: true,
            adjustment: true,
          },
        },
      },
    });
    
    if (!court) {
      throw new Error('Cancha no encontrada');
    }
    
    // Obtener información del usuario si se proporciona
    let user: (User & { memberships: any[] }) | null = null;
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
    const basePerHour = Number(court.basePricePerHour || 0);
    const basePrice = basePerHour * durationInHours;
    
    // Encontrar reglas de precios aplicables
    const applicableRules = this.findApplicablePricingRules(
      (court.pricingRules as any[]).map(r => ({
        ...r,
        // Fallback para esquemas antiguos: mapear desde adjustment/conditions
        priceMultiplier: (r as any).priceMultiplier ?? (r as any).adjustment?.priceMultiplier ?? 1.0,
        memberDiscount: (r as any).memberDiscount ?? (r as any).adjustment?.memberDiscount ?? 0,
        timeStart: (r as any).timeStart ?? (r as any).conditions?.timeStart,
        timeEnd: (r as any).timeEnd ?? (r as any).conditions?.timeEnd,
        daysOfWeek: (r as any).daysOfWeek ?? (r as any).conditions?.daysOfWeek ?? [],
        seasonStart: (r as any).seasonStart ?? (r as any).conditions?.seasonStart ?? null,
        seasonEnd: (r as any).seasonEnd ?? (r as any).conditions?.seasonEnd ?? null,
      })) as any,
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
      const { priceMultiplier, memberDiscount: ruleMemberDiscount } = this.getRuleAdjustment(rule as any);

      finalMultiplier *= priceMultiplier;
      appliedRules.push(rule.name);
      
      if (priceMultiplier !== 1.0) {
        const ruleEffect = basePrice * (priceMultiplier - 1);
        breakdown.push({
          description: `${rule.name} (${priceMultiplier}x)`,
          amount: ruleEffect,
        });
      }
      
      // Aplicar descuento de miembro si corresponde
      if (user && this.hasMembership(user) && ruleMemberDiscount > memberDiscount) {
        memberDiscount = ruleMemberDiscount;
      }
    }
    
    // Calcular precios
    const subtotal = basePrice * finalMultiplier;
    const discount = subtotal * memberDiscount;
    let total = subtotal - discount;
    // Impuestos (IVA/IGIC) desde configuración del centro
    const centerSettings: any = (court as any).center?.settings || {};
    const taxesCfg: any = centerSettings.taxes || {};
    const taxRatePct: number = Number(taxesCfg.rate ?? 0);
    const taxIncluded: boolean = !!taxesCfg.included; // si true, el precio ya incluye impuestos
    let taxAmount = 0;
    if (taxRatePct > 0) {
      const rate = taxRatePct / 100;
      if (taxIncluded) {
        // total ya incluye impuestos → informar componente impositivo
        const net = total / (1 + rate);
        taxAmount = total - net;
        breakdown.push({ description: `Impuestos incluidos (${taxRatePct}%)`, amount: taxAmount });
      } else {
        // agregar impuestos sobre el total
        taxAmount = total * rate;
        breakdown.push({ description: `Impuestos (${taxRatePct}%)`, amount: taxAmount });
        total += taxAmount;
      }
    }
    
    // Agregar breakdown del precio base
    breakdown.unshift({
      description: `Precio base (${durationInHours}h × €${basePerHour})`,
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
      taxRate: taxRatePct || undefined,
      taxAmount: taxAmount || undefined,
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
      const { daysOfWeek, seasonStart, seasonEnd, timeStart, timeEnd } = this.getRuleConditions(rule);

      // Verificar día de la semana
      if (daysOfWeek.length > 0 && !daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
      
      // Verificar temporada
      if (seasonStart && seasonEnd) {
        const currentDate = new Date(startTime);
        currentDate.setHours(0, 0, 0, 0);
        
        if (currentDate < seasonStart || currentDate > seasonEnd) {
          return false;
        }
      }
      
      // Verificar horario
      const ruleStartTime = this.parseTimeString(timeStart || '00:00');
      const ruleEndTime = this.parseTimeString(timeEnd || '23:59');
      
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
   * Extraer condiciones de una regla, soportando tanto columnas explícitas
   * (timeStart, daysOfWeek, seasonStart, seasonEnd) como JSON `conditions`.
   */
  private getRuleConditions(rule: PricingRule): {
    daysOfWeek: number[];
    seasonStart: Date | null;
    seasonEnd: Date | null;
    timeStart: string | undefined;
    timeEnd: string | undefined;
  } {
    const anyRule = rule as any;
    const json = (anyRule.conditions || {}) as Record<string, any>;
    const daysOfWeek = Array.isArray(anyRule.daysOfWeek)
      ? (anyRule.daysOfWeek as unknown as number[])
      : Array.isArray(json.daysOfWeek)
        ? (json.daysOfWeek as number[])
        : [];
    const seasonStart = (anyRule.seasonStart ? new Date(anyRule.seasonStart) : (json.seasonStart ? new Date(json.seasonStart) : null)) as Date | null;
    const seasonEnd = (anyRule.seasonEnd ? new Date(anyRule.seasonEnd) : (json.seasonEnd ? new Date(json.seasonEnd) : null)) as Date | null;
    const timeStart = (anyRule.timeStart as string) || (json.timeStart as string | undefined);
    const timeEnd = (anyRule.timeEnd as string) || (json.timeEnd as string | undefined);
    return { daysOfWeek, seasonStart, seasonEnd, timeStart, timeEnd };
  }

  /**
   * Extraer ajustes de una regla, soportando columnas explícitas (priceMultiplier, memberDiscount)
   * y JSON `adjustment` como fallback.
   */
  private getRuleAdjustment(rule: PricingRule): { priceMultiplier: number; memberDiscount: number } {
    const anyRule = rule as any;
    if (anyRule.priceMultiplier !== undefined || anyRule.memberDiscount !== undefined) {
      return {
        priceMultiplier: Number(anyRule.priceMultiplier ?? 1.0),
        memberDiscount: Number(anyRule.memberDiscount ?? 0),
      };
    }
    const adjustment = (anyRule.adjustment || {}) as Record<string, any>;
    return {
      priceMultiplier: Number(adjustment.priceMultiplier ?? 1.0),
      memberDiscount: Number(adjustment.memberDiscount ?? 0),
    };
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
    // Aceptar tanto el schema nativo como variantes usadas por la API (membershipDiscount en % y/o timeSlots)
    const normalized: any = { ...input };
    // Mapear membershipDiscount % → decimal si viene > 1
    if (typeof (normalized.membershipDiscount) === 'number' && normalized.membershipDiscount > 1) {
      normalized.memberDiscount = Number((normalized.membershipDiscount / 100).toFixed(4));
    }
    // Si vienen timeSlots, crear una regla por cada slot; devolver la primera creada
    const timeSlots: Array<{ start: string; end: string; multiplier?: number }>|undefined = (normalized as any).timeSlots;
    const basePayload = {
      courtId: normalized.courtId,
      name: normalized.name,
      timeStart: normalized.timeStart,
      timeEnd: normalized.timeEnd,
      daysOfWeek: normalized.daysOfWeek ?? [],
      seasonStart: normalized.seasonStart,
      seasonEnd: normalized.seasonEnd,
      priceMultiplier: normalized.priceMultiplier ?? (normalized.multiplier ?? 1.0),
      memberDiscount: normalized.memberDiscount ?? 0,
      isActive: normalized.isActive ?? true,
    };

    if (Array.isArray(timeSlots) && timeSlots.length > 0) {
      const created: PricingRule[] = [];
      for (const slot of timeSlots) {
        const payload = {
          ...basePayload,
          timeStart: slot.start,
          timeEnd: slot.end,
          priceMultiplier: slot.multiplier ?? basePayload.priceMultiplier,
        };
        const rule = await this.createPricingRule(payload as any);
        created.push(rule);
      }
      return created[0];
    }

    const validatedInput = CreatePricingRuleSchema.parse(basePayload);
    
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
    
    const conditions = {
      timeStart: validatedInput.timeStart,
      timeEnd: validatedInput.timeEnd,
      daysOfWeek: validatedInput.daysOfWeek,
      seasonStart: validatedInput.seasonStart ?? null,
      seasonEnd: validatedInput.seasonEnd ?? null,
    };
    const adjustment = {
      priceMultiplier: validatedInput.priceMultiplier,
      memberDiscount: validatedInput.memberDiscount,
    };

    // Algunos campos del modelo (type, validFrom, validUntil, priority) pueden existir según el esquema actual.
    // Para mantener compatibilidad entre esquemas, enviamos solo campos seguros y casteamos como any.
    return await (db.pricingRule as any).create({
      data: {
        courtId: validatedInput.courtId,
        name: validatedInput.name,
        isActive: validatedInput.isActive,
        // Guardar condiciones tanto en columnas explícitas como en JSON para compatibilidad
        timeStart: validatedInput.timeStart,
        timeEnd: validatedInput.timeEnd,
        daysOfWeek: validatedInput.daysOfWeek as unknown as any,
        seasonStart: validatedInput.seasonStart ?? undefined,
        seasonEnd: validatedInput.seasonEnd ?? undefined,
        priceMultiplier: validatedInput.priceMultiplier as unknown as any,
        memberDiscount: validatedInput.memberDiscount as unknown as any,
        conditions,
        adjustment,
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
    // Normalizar variantes (membershipDiscount % y timeSlots)
    const dataIn: any = { ...input };
    if (typeof dataIn.membershipDiscount === 'number' && dataIn.membershipDiscount > 1) {
      dataIn.memberDiscount = Number((dataIn.membershipDiscount / 100).toFixed(4));
    }
    if (Array.isArray(dataIn.timeSlots) && dataIn.timeSlots.length > 0) {
      const first = dataIn.timeSlots[0];
      dataIn.timeStart = first.start;
      dataIn.timeEnd = first.end;
      if (typeof first.multiplier === 'number') {
        dataIn.priceMultiplier = first.multiplier;
      }
    }

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
    
    // Preparar actualización sobre conditions/adjustment si vienen campos del schema extendido
    const data: any = { ...dataIn };
    if (
      input.timeStart ||
      input.timeEnd ||
      input.daysOfWeek ||
      input.seasonStart ||
      input.seasonEnd
    ) {
      const current = (existingRule as any).conditions || {};
      data.conditions = {
        ...current,
        ...(input.timeStart ? { timeStart: input.timeStart } : {}),
        ...(input.timeEnd ? { timeEnd: input.timeEnd } : {}),
        ...(input.daysOfWeek ? { daysOfWeek: input.daysOfWeek } : {}),
        ...(input.seasonStart ? { seasonStart: input.seasonStart } : {}),
        ...(input.seasonEnd ? { seasonEnd: input.seasonEnd } : {}),
      };
      // Eliminar campos desconocidos para el modelo base
      delete (data as any).timeStart;
      delete (data as any).timeEnd;
      delete (data as any).daysOfWeek;
      delete (data as any).seasonStart;
      delete (data as any).seasonEnd;
    }

    if (
      input.priceMultiplier !== undefined ||
      input.memberDiscount !== undefined
    ) {
      const currentAdj = (existingRule as any).adjustment || {};
      data.adjustment = {
        ...currentAdj,
        ...(input.priceMultiplier !== undefined ? { priceMultiplier: input.priceMultiplier } : {}),
        ...(input.memberDiscount !== undefined ? { memberDiscount: input.memberDiscount } : {}),
      };
      delete (data as any).priceMultiplier;
      delete (data as any).memberDiscount;
      // También actualizar columnas explícitas si vienen
      if (input.priceMultiplier !== undefined) {
        (data as any).priceMultiplier = input.priceMultiplier as unknown as any;
      }
      if (input.memberDiscount !== undefined) {
        (data as any).memberDiscount = input.memberDiscount as unknown as any;
      }
    }

    return await (db.pricingRule as any).update({
      where: { id },
      data,
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
   * Obtener reglas con filtros opcionales
   */
  async getPricingRules(filters: {
    courtId?: string;
    centerId?: string;
    sport?: string;
    isActive?: boolean;
  }): Promise<PricingRule[]> {
    const where: any = {};
    if (filters.courtId) where.courtId = filters.courtId;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (filters.centerId || filters.sport) {
      where.court = { is: {} };
      if (filters.centerId) where.court.is.centerId = filters.centerId;
      if (filters.sport) where.court.is.sportType = filters.sport;
    }
    try {
      return await db.pricingRule.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { name: 'asc' }],
      });
    } catch (error) {
      console.warn('PricingService.getPricingRules fallback (no table or columns mismatch):', error);
      return [];
    }
  }

  /**
   * Obtener una regla por ID
   */
  async getPricingRuleById(id: string): Promise<PricingRule | null> {
    return await db.pricingRule.findUnique({ where: { id } });
  }

  /**
   * Probar una regla específica contra una entrada
   */
  async testPricingRule(
    ruleId: string,
    input: { courtId: string; startTime: Date; duration: number; userId?: string }
  ): Promise<PriceCalculation> {
    const rule = await this.getPricingRuleById(ruleId);
    if (!rule) {
      throw new Error('Regla de precios no encontrada');
    }
    const court = await db.court.findUnique({
      where: { id: input.courtId },
    });
    if (!court) {
      throw new Error('Cancha no encontrada');
    }
    // Precio base
    const durationInHours = input.duration / 60;
    const basePrice = Number(court.basePricePerHour) * durationInHours;
    const applicable = this.findApplicablePricingRules([rule], input.startTime, input.duration);
    let finalMultiplier = 1.0;
    let memberDiscount = 0;
    const appliedRules: string[] = [];
    const breakdown: { description: string; amount: number }[] = [];
    for (const r of applicable) {
      const { priceMultiplier, memberDiscount: ruleMemberDiscount } = this.getRuleAdjustment(r);
      finalMultiplier *= priceMultiplier;
      appliedRules.push(r.name);
      if (priceMultiplier !== 1.0) {
        breakdown.push({ description: `${r.name} (${priceMultiplier}x)`, amount: basePrice * (priceMultiplier - 1) });
      }
      if (ruleMemberDiscount > memberDiscount) memberDiscount = ruleMemberDiscount;
    }
    const subtotal = basePrice * finalMultiplier;
    const discount = subtotal * memberDiscount;
    const total = subtotal - discount;
    breakdown.unshift({ description: `Precio base (${durationInHours}h × €${court.basePricePerHour})`, amount: basePrice });
    if (discount > 0) breakdown.push({ description: `Descuento de miembro (${memberDiscount * 100}%)`, amount: -discount });
    return { basePrice, multiplier: finalMultiplier, memberDiscount, subtotal, discount, total, appliedRules, breakdown };
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
        status: { in: [ReservationStatus.PAID, ReservationStatus.COMPLETED] },
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