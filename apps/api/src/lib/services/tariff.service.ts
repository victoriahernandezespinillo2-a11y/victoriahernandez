import { db, TariffSegment, TariffEnrollmentStatus } from '@repo/db';
import { z } from 'zod';

const cuidOrUuid = (message: string) =>
  z.string().uuid({ message }).or(z.string().cuid({ message }));

const createTariffSchema = z.object({
  segment: z.nativeEnum(TariffSegment),
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0).optional(),
  discountPercent: z.number().min(0).max(100),
  description: z.string().max(500).optional(),
  requiresManualApproval: z.boolean().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  courtIds: z
    .array(cuidOrUuid('ID de cancha inválido'))
    .optional()
    .transform((value) => (Array.isArray(value) ? Array.from(new Set(value)) : undefined)),
});

const updateTariffSchema = createTariffSchema.partial();

const listTariffsSchema = z.object({
  segment: z.nativeEnum(TariffSegment).optional(),
  isActive: z.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateTariffInput = z.infer<typeof createTariffSchema>;
export type UpdateTariffInput = z.infer<typeof updateTariffSchema>;
export type ListTariffsInput = z.infer<typeof listTariffsSchema>;

export class TariffService {
  async createTariff(input: CreateTariffInput) {
    const { courtIds = [], ...data } = createTariffSchema.parse(input);
    this.validateAges(data.minAge, data.maxAge);

    const conflict = await db.ageBasedTariff.findFirst({
      where: {
        segment: data.segment,
        isActive: true,
      },
    });

    if (conflict) {
      throw new Error('Ya existe una tarifa activa para este segmento');
    }

    const discountPercent = this.normalizeDiscount(data.discountPercent);
    const now = new Date();
    const validFrom = data.validFrom ?? now;
    const validUntil = data.validUntil ?? null;

    if (validUntil && validUntil <= validFrom) {
      throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }

    await this.validateCourtIds(courtIds);

    const tariff = await db.ageBasedTariff.create({
      data: {
        segment: data.segment,
        minAge: data.minAge,
        maxAge: data.maxAge ?? null,
        discountPercent,
        description: data.description,
        requiresManualApproval: data.requiresManualApproval ?? true,
        validFrom,
        validUntil,
        isActive: data.isActive ?? true,
      },
    });

    if (courtIds.length > 0) {
      await db.tariffCourt.createMany({
        data: courtIds.map((courtId) => ({
          tariffId: tariff.id,
          courtId,
        })),
        skipDuplicates: true,
      });
    }

    return this.getTariffById(tariff.id);
  }

  async updateTariff(id: string, input: UpdateTariffInput) {
    const { courtIds, ...data } = updateTariffSchema.parse(input);
    const existing = await db.ageBasedTariff.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Tarifa no encontrada');
    }

    if (data.minAge !== undefined || data.maxAge !== undefined) {
      const minAge = data.minAge ?? existing.minAge;
      const maxAge = data.maxAge ?? existing.maxAge ?? undefined;
      this.validateAges(minAge, maxAge);
    }

    if (data.segment && data.segment !== existing.segment) {
      const conflict = await db.ageBasedTariff.findFirst({
        where: {
          segment: data.segment,
          isActive: true,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new Error('Ya existe una tarifa activa para este segmento');
      }
    }

    const validFrom = data.validFrom ?? existing.validFrom;
    const validUntil = data.validUntil ?? existing.validUntil;

    if (validUntil && validUntil <= validFrom) {
      throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }

    const discountPercent = data.discountPercent !== undefined
      ? this.normalizeDiscount(data.discountPercent)
      : existing.discountPercent;

    if (courtIds !== undefined) {
      await this.validateCourtIds(courtIds);
    }

    const tariff = await db.ageBasedTariff.update({
      where: { id },
      data: {
        segment: data.segment ?? existing.segment,
        minAge: data.minAge ?? existing.minAge,
        maxAge: data.maxAge ?? existing.maxAge,
        discountPercent,
        description: data.description ?? existing.description,
        requiresManualApproval: data.requiresManualApproval ?? existing.requiresManualApproval,
        validFrom,
        validUntil,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    if (courtIds !== undefined) {
      await this.syncTariffCourts(id, courtIds);
    }

    return this.getTariffById(tariff.id);
  }

  async getActiveTariffs(referenceDate: Date = new Date()) {
    return db.ageBasedTariff.findMany({
      where: {
        isActive: true,
        validFrom: { lte: referenceDate },
        OR: [
          { validUntil: null },
          { validUntil: { gte: referenceDate } },
        ],
      },
      orderBy: { minAge: 'asc' },
      include: {
        courts: {
          include: {
            court: {
              select: { id: true, name: true, centerId: true },
            },
          },
        },
      },
    });
  }

  async getTariffById(id: string) {
    const tariff = await db.ageBasedTariff.findUnique({
      where: { id },
      include: {
        courts: {
          include: {
            court: {
              select: { id: true, name: true, centerId: true },
            },
          },
        },
      },
    });

    if (!tariff) {
      throw new Error('Tarifa no encontrada');
    }

    return tariff;
  }

  async listTariffs(input: ListTariffsInput) {
    const data = listTariffsSchema.parse(input);
    const skip = (data.page - 1) * data.limit;
    const where: Record<string, any> = {};

    if (data.segment) {
      where.segment = data.segment;
    }

    if (data.isActive !== undefined) {
      where.isActive = data.isActive;
    }

    if (data.from || data.to) {
      where.AND = [] as any[];
      if (data.from) {
        where.AND.push({ validUntil: { gte: data.from } });
      }
      if (data.to) {
        where.AND.push({ validFrom: { lte: data.to } });
      }
    }

    const [items, total] = await Promise.all([
      db.ageBasedTariff.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { minAge: 'asc' }],
        skip,
        take: data.limit,
        include: {
          courts: {
            include: {
              court: {
                select: { id: true, name: true, centerId: true },
              },
            },
          },
        },
      }),
      db.ageBasedTariff.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: data.page,
        limit: data.limit,
        pages: Math.ceil(total / data.limit),
      },
    };
  }

  async hasApprovedEnrollment(userId: string, referenceDate: Date = new Date()) {
    const enrollment = await db.tariffEnrollment.findFirst({
      where: {
        userId,
        status: TariffEnrollmentStatus.APPROVED,
        tariff: {
          isActive: true,
          validFrom: { lte: referenceDate },
          OR: [
            { validUntil: null },
            { validUntil: { gte: referenceDate } },
          ],
        },
        approvedAt: { lte: referenceDate },
      },
      include: {
        tariff: {
          include: {
            courts: true,
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
    });

    if (!enrollment) {
      return null;
    }

    return enrollment;
  }

  private validateAges(minAge: number, maxAge?: number) {
    if (maxAge !== undefined && maxAge < minAge) {
      throw new Error('El rango de edades es inválido');
    }
  }

  private normalizeDiscount(value: number) {
    const normalized = value > 1 ? Number((value / 100).toFixed(4)) : value;
    if (normalized < 0 || normalized > 1) {
      throw new Error('El porcentaje de descuento debe estar entre 0 y 100');
    }
    return normalized;
  }

  private async validateCourtIds(courtIds?: string[]) {
    if (!courtIds || courtIds.length === 0) return;
    const uniqueIds = Array.from(new Set(courtIds));
    const courts = await db.court.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (courts.length !== uniqueIds.length) {
      throw new Error('Una o más canchas seleccionadas no existen');
    }
  }

  private async syncTariffCourts(tariffId: string, courtIds: string[]) {
    const uniqueIds = Array.from(new Set(courtIds));
    if (uniqueIds.length === 0) {
      await db.tariffCourt.deleteMany({ where: { tariffId } });
      return;
    }

    await db.$transaction([
      db.tariffCourt.deleteMany({ where: { tariffId } }),
      db.tariffCourt.createMany({
        data: uniqueIds.map((courtId) => ({ tariffId, courtId })),
        skipDuplicates: true,
      }),
    ]);
  }
}
