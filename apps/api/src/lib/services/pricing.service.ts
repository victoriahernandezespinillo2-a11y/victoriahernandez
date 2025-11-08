import { db, type PricingRule, type Court, type User } from '@repo/db';
// Evitar enums de Prisma en este entorno; usar literales
import { z } from 'zod';
import { TariffService } from './tariff.service';

// Esquemas de validación
export const CalculatePriceSchema = z.object({
  courtId: z.string().min(1, 'courtId requerido'),
  startTime: z.date(),
  duration: z.number().min(30).max(480), // 30 minutos a 8 horas
  userId: z.string().min(1).optional(),
  // Selección de iluminación por parte del usuario (opcional)
  lightingSelected: z.boolean().optional(),
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
  // Desglose de iluminación
  lighting?: {
    selected: boolean;
    extra: number;
    policy: 'OPTIONAL_DAY' | 'INCLUDED_NIGHT' | 'UNAVAILABLE' | 'NO_SELECTION';
  };
}

export class PricingService {
  private tariffService = new TariffService();
  /**
   * Calcular precio dinámico para una reserva
   */
  async calculatePrice(input: CalculatePriceInput): Promise<PriceCalculation> {
    const validatedInput = CalculatePriceSchema.parse(input);
    
    // Obtener información de la cancha
    const court = await db.court.findUnique({
      where: { id: validatedInput.courtId },
      include: {
        center: { select: { settings: true, timezone: true, dayStart: true, nightStart: true } },
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
    let tariffEnrollment: Awaited<ReturnType<TariffService['hasApprovedEnrollment']>> | null = null;
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
      try {
        tariffEnrollment = await this.tariffService.hasApprovedEnrollment(
          validatedInput.userId,
          validatedInput.startTime
        );
      } catch (error) {
        console.error('[TARIFF-DISCOUNT] Error obteniendo tarifa aprobada:', error);
      }
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
    let tariffDiscountRate = 0;
    let tariffDiscountAmount = 0;
    const allowedCourtIds = Array.isArray((tariffEnrollment as any)?.tariff?.courts)
      ? (tariffEnrollment as any).tariff.courts.map((c: any) => c.courtId)
      : [];
    const courtEligible = allowedCourtIds.length === 0 || allowedCourtIds.includes(court.id);

    if (tariffEnrollment?.tariff && courtEligible) {
      tariffDiscountRate = Number(tariffEnrollment.tariff.discountPercent ?? 0);
      if (tariffDiscountRate > 1) {
        tariffDiscountRate = tariffDiscountRate / 100;
      }
      if (tariffDiscountRate > 0) {
        tariffDiscountAmount = Number((subtotal * tariffDiscountRate).toFixed(2));
        appliedRules.push(`Tarifa regulada (${tariffEnrollment.tariff.segment})`);
      }
    }

    const subtotalAfterTariff = subtotal - tariffDiscountAmount;
    const memberDiscountAmount = Number((subtotalAfterTariff * memberDiscount).toFixed(2));
    const discount = tariffDiscountAmount + memberDiscountAmount;
    let total = subtotalAfterTariff - memberDiscountAmount;
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
    
    // Agregar descuento de tarifa regulada si aplica
    if (tariffDiscountAmount > 0) {
      breakdown.push({
        description: `Descuento tarifa regulada (${(tariffDiscountRate * 100).toFixed(0)}%)`,
        amount: -tariffDiscountAmount,
      });
    }
    
    // Agregar descuento de miembro si aplica
    if (memberDiscountAmount > 0) {
      breakdown.push({
        description: `Descuento de miembro (${memberDiscount * 100}%)`,
        amount: -memberDiscountAmount,
      });
    }
    
    // ===== Iluminación opcional/obligatoria =====
    let lightingInfo: PriceCalculation['lighting'] = { selected: false, extra: 0, policy: 'UNAVAILABLE' };
    try {
      const hasLighting = (court as any).hasLighting ?? (court as any).lighting ?? false;
      if (hasLighting) {
        const perHourExtra = Number((court as any).lightingExtraPerHour ?? 0);
        const tz = ((court as any).center?.timezone as string) || 'America/Bogota';
        const dayStartStr = (((court as any).center?.dayStart as string) || '06:00');
        const nightStartStr = (((court as any).center?.nightStart as string) || '18:00');

        const dayStartMin = this.parseTimeString(dayStartStr);
        const nightStartMin = this.parseTimeString(nightStartStr);
        const start = validatedInput.startTime;
        const end = new Date(start.getTime() + validatedInput.duration * 60000);

        const { minutesInDay, startIsDay } = this.computeDayPortionMinutes(start, end, tz, dayStartMin, nightStartMin);
        const userSelected = !!validatedInput.lightingSelected;
        if (startIsDay) {
          // Política: en día es opcional
          const extra = userSelected ? (perHourExtra * (minutesInDay / 60)) : 0;
          if (extra > 0) breakdown.push({ description: `Iluminación (${(minutesInDay/60).toFixed(2)}h × €${perHourExtra})`, amount: extra });
          total += extra;
          lightingInfo = { selected: userSelected, extra, policy: 'OPTIONAL_DAY' };
        } else {
          // Noche: obligatoria CON coste
          const extra = perHourExtra * ((validatedInput.duration - minutesInDay) / 60);
          if (extra > 0) breakdown.push({ description: `Iluminación nocturna (${((validatedInput.duration - minutesInDay)/60).toFixed(2)}h × €${perHourExtra})`, amount: extra });
          total += extra;
          lightingInfo = { selected: true, extra, policy: 'INCLUDED_NIGHT' };
        }
      } else {
        lightingInfo = { selected: false, extra: 0, policy: 'UNAVAILABLE' };
      }
    } catch (e) {
      // En caso de error, no afectar el total
      lightingInfo = { selected: false, extra: 0, policy: 'NO_SELECTION' };
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
      lighting: lightingInfo,
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
    const timeParts = timeString.split(':').map(Number);
    const [hours = 0, minutes = 0] = timeParts;
    return hours * 60 + minutes;
  }

  /**
   * Calcula minutos de una reserva que caen dentro del tramo diurno [dayStartMin, nightStartMin)
   * según la zona horaria indicada. También indica si el inicio de la reserva cae en día.
   */
  private computeDayPortionMinutes(
    startUTC: Date,
    endUTC: Date,
    timezone: string,
    dayStartMin: number,
    nightStartMin: number
  ): { minutesInDay: number; startIsDay: boolean } {
    // Helpers para obtener partes locales
    const getLocal = (d: Date) => {
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
      const dayStr = `${parts.year}-${parts.month}-${parts.day}`;
      const minutes = Number(parts.hour) * 60 + Number(parts.minute);
      return { dayStr, minutes };
    };

    const s = getLocal(startUTC);
    const e = getLocal(endUTC);

    const isInDayRange = (min: number) => min >= dayStartMin && min < nightStartMin;
    const startIsDay = isInDayRange(s.minutes);

    const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

    if (s.dayStr === e.dayStr) {
      const minutesInDay = overlap(s.minutes, e.minutes, dayStartMin, nightStartMin);
      return { minutesInDay, startIsDay };
    }

    // Cruza medianoche local: dividir en dos segmentos
    const endOfDay = 24 * 60;
    const firstPart = overlap(s.minutes, endOfDay, dayStartMin, nightStartMin);
    const secondPart = overlap(0, e.minutes, dayStartMin, nightStartMin);
    return { minutesInDay: firstPart + secondPart, startIsDay };
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
    
    // Si hay timeSlots, usar el primer slot para crear el basePayload
    if (Array.isArray(timeSlots) && timeSlots.length > 0) {
      const firstSlot = timeSlots[0];
      if (firstSlot) {
        normalized.timeStart = firstSlot.start;
        normalized.timeEnd = firstSlot.end;
        if (firstSlot.multiplier) {
          normalized.priceMultiplier = firstSlot.multiplier;
        }
      }
    }
    
    // Validar campos requeridos
    if (!normalized.courtId) {
      throw new Error('courtId es requerido');
    }
    if (!normalized.name) {
      throw new Error('name es requerido');
    }
    if (!normalized.timeStart) {
      throw new Error('timeStart es requerido');
    }
    if (!normalized.timeEnd) {
      throw new Error('timeEnd es requerido');
    }
    
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
      if (created.length === 0) {
        throw new Error('No se pudo crear ninguna regla de precios');
      }
      return created[0]!;
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
    
    const createData = {
      courtId: validatedInput.courtId,
      name: validatedInput.name,
      type: 'TIME_BASED', // Campo requerido
      isActive: validatedInput.isActive,
      // Guardar condiciones tanto en columnas explícitas como en JSON para compatibilidad
      timeStart: validatedInput.timeStart,
      timeEnd: validatedInput.timeEnd,
      daysOfWeek: validatedInput.daysOfWeek as unknown as any,
      seasonStart: validatedInput.seasonStart ?? undefined,
      seasonEnd: validatedInput.seasonEnd ?? undefined,
      priceMultiplier: validatedInput.priceMultiplier as unknown as any,
      memberDiscount: validatedInput.memberDiscount as unknown as any,
      // Campos requeridos del modelo
      validFrom: new Date(), // Fecha actual como inicio de validez
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año desde ahora
      conditions: conditions,
      adjustment: adjustment,
    };
    
    console.log('Creating pricing rule with data:', JSON.stringify(createData, null, 2));
    
    try {
      return await (db.pricingRule as any).create({
        data: createData,
      });
    } catch (error) {
      console.error('Error creating pricing rule in database:', error);
      console.error('Create data was:', JSON.stringify(createData, null, 2));
      throw new Error(`Error creando regla de precios en base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
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
        status: { in: ['PAID', 'COMPLETED'] },
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
    
    const prices: number[] = reservations.map((r: any) => Number(r.totalPrice));
    const totalRevenue = prices.reduce((sum: number, price: number) => sum + price, 0);
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
      count: prices.filter((price: number) => price >= range.min && price < range.max).length,
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

  /**
   * Calcular proyección de ingresos para un rango de fechas y conjunto de canchas
   * Estrategia simple: estimar horas reservadas = horas_totales * ocupación.
   * Ingreso proyectado por cancha = horas_reservadas * tarifa_base_por_hora.
   * Si se proporcionan escenarios, se calculan totales por escenario variando ocupación y multiplicador.
   */
  async calculateRevenueProjection(input: {
    centerId?: string;
    courtIds?: string[];
    startDate: Date;
    endDate: Date;
    occupancyRate: number; // 0-100
    scenarios?: Array<{ name: string; occupancyRate: number; priceMultiplier?: number }>;
  }): Promise<{
    totalProjected: number;
    byCourt: Array<{ courtId: string; projected: number }>;
    scenarios?: Array<{ name: string; totalProjected: number }>;
    period: { startDate: string; endDate: string };
    assumptions: { occupancyRate: number; avgDurationMinutes: number };
  }> {
    const { centerId, courtIds: inputCourtIds, startDate, endDate, occupancyRate, scenarios } = input;

    // Obtener canchas involucradas y normalizar Decimal a número
    let courts: Array<{ id: string; basePricePerHour: number | null }>; 
    if (inputCourtIds && inputCourtIds.length > 0) {
      const raw = await db.court.findMany({
        where: { id: { in: inputCourtIds } },
        select: { id: true, basePricePerHour: true },
      });
      courts = raw.map((c: any) => ({ id: c.id, basePricePerHour: Number(c.basePricePerHour ?? 0) }));
    } else if (centerId) {
      const raw = await db.court.findMany({
        where: { centerId },
        select: { id: true, basePricePerHour: true },
      });
      courts = raw.map((c: any) => ({ id: c.id, basePricePerHour: Number(c.basePricePerHour ?? 0) }));
    } else {
      courts = [];
    }

    const msInHour = 1000 * 60 * 60;
    const totalHours = Math.max(0, (endDate.getTime() - startDate.getTime()) / msInHour);
    const occupancy = Math.min(Math.max(occupancyRate, 0), 100) / 100; // clamp 0..1
    const avgDurationMinutes = 60; // suposición conservadora 1h por reserva

    // Proyección base por cancha usando tarifa base por hora
    const byCourt = courts.map((c) => {
      const hourlyRate = Number(c.basePricePerHour || 0);
      const bookedHours = totalHours * occupancy;
      const projected = bookedHours * hourlyRate;
      return { courtId: c.id, projected };
    });

    const totalProjected = byCourt.reduce((sum, x) => sum + x.projected, 0);

    // Escenarios opcionales
    let scenarioResults: Array<{ name: string; totalProjected: number }> | undefined;
    if (Array.isArray(scenarios) && scenarios.length > 0) {
      scenarioResults = scenarios.map((s) => {
        const occ = Math.min(Math.max(s.occupancyRate, 0), 100) / 100;
        const multiplier = typeof s.priceMultiplier === 'number' ? s.priceMultiplier : 1;
        const scenarioTotal = courts.reduce((sum, c) => {
          const hourlyRate = Number(c.basePricePerHour || 0) * multiplier;
          const booked = totalHours * occ * hourlyRate;
          return sum + booked;
        }, 0);
        return { name: s.name, totalProjected: scenarioTotal };
      });
    }

    return {
      totalProjected,
      byCourt,
      scenarios: scenarioResults,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      assumptions: { occupancyRate, avgDurationMinutes },
    };
  }
}

export const pricingService = new PricingService();
