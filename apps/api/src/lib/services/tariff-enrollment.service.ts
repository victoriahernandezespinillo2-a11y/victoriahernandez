import { db, TariffEnrollmentStatus } from '@repo/db';
import { z } from 'zod';
import { TariffService } from './tariff.service';

const cuidOrUuid = (message: string) =>
  z.string().uuid({ message }).or(z.string().cuid({ message }));

const createEnrollmentSchema = z.object({
  userId: cuidOrUuid('ID de usuario inválido'),
  tariffId: cuidOrUuid('ID de tarifa inválido'),
  notes: z.string().max(500).optional(),
  documentUrl: z.string().url().optional(),
});

const updateStatusSchema = z.object({
  enrollmentId: cuidOrUuid('ID de solicitud inválido'),
  adminId: cuidOrUuid('ID de administrador inválido'),
  notes: z.string().max(500).optional(),
});

const listEnrollmentsSchema = z.object({
  status: z.nativeEnum(TariffEnrollmentStatus).optional(),
  segment: z.string().optional(),
  userId: cuidOrUuid('ID de usuario inválido').optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentStatusInput = z.infer<typeof updateStatusSchema>;
export type ListEnrollmentsInput = z.infer<typeof listEnrollmentsSchema>;

export class TariffEnrollmentService {
  private tariffService: TariffService;

  constructor() {
    this.tariffService = new TariffService();
  }

  async createEnrollment(input: CreateEnrollmentInput) {
    const data = createEnrollmentSchema.parse(input);

    const [user, tariff] = await Promise.all([
      db.user.findUnique({
        where: { id: data.userId },
        select: { id: true, dateOfBirth: true },
      }),
      db.ageBasedTariff.findUnique({ where: { id: data.tariffId } }),
    ]);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (!tariff || !tariff.isActive) {
      throw new Error('Tarifa no disponible');
    }

    const existing = await db.tariffEnrollment.findFirst({
      where: {
        userId: data.userId,
        tariffId: data.tariffId,
        status: { in: [TariffEnrollmentStatus.PENDING, TariffEnrollmentStatus.APPROVED] },
      },
    });

    if (existing) {
      throw new Error('Ya existe una solicitud activa para esta tarifa');
    }

    this.verifyAge(user.dateOfBirth, tariff);

    const now = new Date();

    const enrollment = await db.tariffEnrollment.create({
      data: {
        userId: data.userId,
        tariffId: data.tariffId,
        notes: data.notes,
        documentUrl: data.documentUrl,
        status: TariffEnrollmentStatus.PENDING,
        requestedAt: now,
      },
      include: {
        tariff: {
          include: {
            courts: {
              include: {
                court: { select: { id: true, name: true, centerId: true } },
              },
            },
          },
        },
      },
    });

    await this.createAuditEntry({
      enrollmentId: enrollment.id,
      oldStatus: null,
      newStatus: TariffEnrollmentStatus.PENDING,
      changedBy: null,
      notesSnapshot: data.notes ?? null,
    });

    return enrollment;
  }

  async approveEnrollment(input: UpdateEnrollmentStatusInput) {
    const data = updateStatusSchema.parse(input);
    const enrollment = await db.tariffEnrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        tariff: {
          include: {
            courts: {
              include: {
                court: { select: { id: true, name: true, centerId: true } },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Solicitud no encontrada');
    }

    if (enrollment.status === TariffEnrollmentStatus.APPROVED) {
      return enrollment;
    }

    const now = new Date();

    const updated = await db.tariffEnrollment.update({
      where: { id: data.enrollmentId },
      data: {
        status: TariffEnrollmentStatus.APPROVED,
        approvedAt: now,
        approvedBy: data.adminId,
        notes: data.notes ?? enrollment.notes,
      },
      include: {
        tariff: {
          include: {
            courts: {
              include: {
                court: { select: { id: true, name: true, centerId: true } },
              },
            },
          },
        },
      },
    });

    await this.createAuditEntry({
      enrollmentId: updated.id,
      oldStatus: enrollment.status,
      newStatus: TariffEnrollmentStatus.APPROVED,
      changedBy: data.adminId,
      notesSnapshot: updated.notes ?? null,
    });

    return updated;
  }

  async rejectEnrollment(input: UpdateEnrollmentStatusInput & { reason: string }) {
    const { reason, ...rest } = input;
    const data = updateStatusSchema.parse(rest);

    if (!reason || reason.trim().length === 0) {
      throw new Error('Debe especificar un motivo de rechazo');
    }

    const enrollment = await db.tariffEnrollment.findUnique({ where: { id: data.enrollmentId } });

    if (!enrollment) {
      throw new Error('Solicitud no encontrada');
    }

    if (enrollment.status === TariffEnrollmentStatus.REJECTED) {
      return enrollment;
    }

    const updated = await db.tariffEnrollment.update({
      where: { id: data.enrollmentId },
      data: {
        status: TariffEnrollmentStatus.REJECTED,
        approvedAt: null,
        approvedBy: data.adminId,
        notes: [reason, data.notes].filter(Boolean).join(' - '),
      },
      include: {
        tariff: {
          include: {
            courts: {
              include: {
                court: { select: { id: true, name: true, centerId: true } },
              },
            },
          },
        },
      },
    });

    await this.createAuditEntry({
      enrollmentId: updated.id,
      oldStatus: enrollment.status,
      newStatus: TariffEnrollmentStatus.REJECTED,
      changedBy: data.adminId,
      notesSnapshot: updated.notes ?? null,
    });

    return updated;
  }

  async listEnrollments(input: ListEnrollmentsInput) {
    const data = listEnrollmentsSchema.parse(input);
    const skip = (data.page - 1) * data.limit;
    const where: Record<string, any> = {};

    if (data.status) {
      where.status = data.status;
    }

    if (data.userId) {
      where.userId = data.userId;
    }

    if (data.segment) {
      where.tariff = { segment: data.segment };
    }

    const [items, total] = await Promise.all([
      db.tariffEnrollment.findMany({
        where,
        include: {
          tariff: {
            include: {
              courts: {
                include: {
                  court: { select: { id: true, name: true, centerId: true } },
                },
              },
            },
          },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: data.limit,
      }),
      db.tariffEnrollment.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: data.page,
        limit: data.limit,
        total,
        pages: Math.ceil(total / data.limit),
      },
    };
  }

  async getUserEnrollments(userId: string) {
    return db.tariffEnrollment.findMany({
      where: { userId },
      include: {
        tariff: {
          include: {
            courts: {
              include: {
                court: { select: { id: true, name: true, centerId: true } },
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  private async createAuditEntry(params: {
    enrollmentId: string;
    oldStatus: TariffEnrollmentStatus | null;
    newStatus: TariffEnrollmentStatus;
    changedBy: string | null;
    notesSnapshot: string | null;
  }) {
    await db.tariffEnrollmentAudit.create({
      data: {
        enrollmentId: params.enrollmentId,
        oldStatus: params.oldStatus ?? TariffEnrollmentStatus.PENDING,
        newStatus: params.newStatus,
        changedBy: params.changedBy,
        notesSnapshot: params.notesSnapshot ?? undefined,
      },
    });
  }

  private verifyAge(birthDate: Date | null, tariff: { minAge: number; maxAge: number | null }) {
    if (!birthDate) {
      throw new Error('El usuario no tiene fecha de nacimiento registrada');
    }

    const now = new Date();
    const age = this.calculateAge(birthDate, now);

    if (age < tariff.minAge) {
      throw new Error('El usuario no cumple con la edad mínima requerida');
    }

    if (tariff.maxAge !== null && age > tariff.maxAge) {
      throw new Error('El usuario supera la edad máxima permitida para esta tarifa');
    }
  }

  private calculateAge(birthDate: Date, reference: Date) {
    let age = reference.getFullYear() - birthDate.getFullYear();
    const monthDiff = reference.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }
}
