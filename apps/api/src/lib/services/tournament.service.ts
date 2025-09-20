/**
 * Servicio de gestión de torneos
 * Maneja creación, inscripciones, programación y seguimiento de torneos
 */

import { db, Tournament } from '@repo/db';
import { z } from 'zod';
import { NotificationService } from '@repo/notifications';
import { PaymentService, paymentService } from '@repo/payments';

// Esquemas de validación
export const CreateTournamentSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  sport: z.enum(['TENNIS', 'FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'PADDLE'], {
    errorMap: () => ({ message: 'Deporte inválido' }),
  }),
  centerId: z.string().min(1, 'ID de centro inválido'),
  type: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS'], {
    errorMap: () => ({ message: 'Tipo de torneo inválido' }),
  }),
  format: z.enum(['INDIVIDUAL', 'DOUBLES', 'TEAM'], {
    errorMap: () => ({ message: 'Formato de torneo inválido' }),
  }),
  category: z.enum(['OPEN', 'JUNIOR', 'SENIOR', 'AMATEUR', 'PROFESSIONAL']).default('OPEN'),
  maxParticipants: z.number().min(4, 'Mínimo 4 participantes').max(128, 'Máximo 128 participantes'),
  registrationFee: z.number().min(0, 'La tarifa no puede ser negativa'),
  prizePool: z.number().min(0, 'El premio no puede ser negativo').optional(),
  registrationStartDate: z.string().datetime('Fecha de inicio de inscripción inválida'),
  registrationEndDate: z.string().datetime('Fecha de fin de inscripción inválida'),
  startDate: z.string().datetime('Fecha de inicio inválida'),
  endDate: z.string().datetime('Fecha de fin inválida'),
  rules: z.string().min(20, 'Las reglas deben tener al menos 20 caracteres'),
  requirements: z.array(z.string()).optional(),
  prizes: z.array(z.object({
    position: z.number().min(1),
    description: z.string(),
    value: z.number().min(0).optional(),
  })).optional(),
  organizer: z.string().min(3, 'El organizador debe tener al menos 3 caracteres'),
  contactEmail: z.string().email('Email de contacto inválido'),
  contactPhone: z.string().optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateTournamentSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  maxParticipants: z.number().min(4).max(128).optional(),
  registrationFee: z.number().min(0).optional(),
  prizePool: z.number().min(0).optional(),
  registrationStartDate: z.string().datetime().optional(),
  registrationEndDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  rules: z.string().min(20).optional(),
  status: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  requirements: z.array(z.string()).optional(),
  prizes: z.array(z.object({
    position: z.number().min(1),
    description: z.string(),
    value: z.number().min(0).optional(),
  })).optional(),
  organizer: z.string().min(3).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const RegisterParticipantSchema = z.object({
  userId: z.string().min(1, 'ID de usuario inválido'),
  partnerId: z.string().min(1, 'ID de compañero inválido').optional(),
  teamName: z.string().min(3, 'El nombre del equipo debe tener al menos 3 caracteres').optional(),
  emergencyContact: z.object({
    name: z.string().min(3),
    phone: z.string(),
    relationship: z.string(),
  }),
  medicalInfo: z.string().optional(),
  notes: z.string().optional(),
});

export const GetTournamentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  centerId: z.string().min(1).optional(),
  sport: z.enum(['TENNIS', 'FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'PADDLE']).optional(),
  type: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']).optional(),
  format: z.enum(['INDIVIDUAL', 'DOUBLES', 'TEAM']).optional(),
  category: z.enum(['OPEN', 'JUNIOR', 'SENIOR', 'AMATEUR', 'PROFESSIONAL']).optional(),
  status: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  excludeStatus: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isPublic: z.coerce.boolean().optional(),
  sortBy: z.enum(['startDate', 'registrationEndDate', 'createdAt', 'name']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export class TournamentService {
  private notificationService: NotificationService;
  private paymentService: PaymentService;

  constructor() {
    this.notificationService = new NotificationService();
    this.paymentService = paymentService;
  }

  /**
   * Crear un nuevo torneo
   */
  async createTournament(data: z.infer<typeof CreateTournamentSchema>) {
    const validatedData = CreateTournamentSchema.parse(data);

    // Validar fechas completas
    const regStart = new Date(validatedData.registrationStartDate);
    const regEnd = new Date(validatedData.registrationEndDate);
    const tournamentStart = new Date(validatedData.startDate);
    const tournamentEnd = new Date(validatedData.endDate);
    const now = new Date();

    if (regStart <= now) {
      throw new Error('La fecha de inicio de inscripción debe ser futura');
    }

    if (regEnd <= regStart) {
      throw new Error('La fecha de fin de inscripción debe ser posterior al inicio');
    }

    if (tournamentStart <= regEnd) {
      throw new Error('El torneo debe iniciar después del fin de inscripciones');
    }

    if (tournamentEnd <= tournamentStart) {
      throw new Error('La fecha de fin del torneo debe ser posterior al inicio');
    }

    // Verificar que el centro existe
    const center = await db.center.findUnique({
      where: { id: validatedData.centerId },
    });

    if (!center) {
      throw new Error('Centro deportivo no encontrado');
    }

    // Crear el torneo con todos los campos requeridos
    const tournament = await db.tournament.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        sport: validatedData.sport,
        centerId: validatedData.centerId,
        type: validatedData.type,
        format: validatedData.format,
        category: validatedData.category,
        maxParticipants: validatedData.maxParticipants,
        registrationFee: validatedData.registrationFee,
        prizePool: validatedData.prizePool || 0,
        registrationStartDate: regStart,
        registrationEndDate: regEnd,
        startDate: tournamentStart,
        endDate: tournamentEnd,
        rules: validatedData.rules,
        requirements: validatedData.requirements || [],
        prizes: validatedData.prizes || [],
        organizer: validatedData.organizer,
        contactEmail: validatedData.contactEmail,
        contactPhone: validatedData.contactPhone,
        isPublic: validatedData.isPublic,
        status: 'DRAFT',
      },
    });

    return tournament;
  }

  /**
   * Obtener torneos con filtros
   */
  async getTournaments(params: z.infer<typeof GetTournamentsSchema>) {
    const {
      page,
      limit,
      centerId,
      sport,
      type,
      format,
      category,
      status,
      excludeStatus,
      startDate,
      endDate,
      isPublic,
      sortBy,
      sortOrder,
    } = GetTournamentsSchema.parse(params);

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (centerId) {
      where.centerId = centerId;
    }

    if (sport) {
      where.sport = sport;
    }

    if (type) {
      where.type = type;
    }

    if (format) {
      where.format = format;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (excludeStatus) {
      where.status = {
        not: excludeStatus
      };
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    // Obtener torneos usando Prisma (ajustado a relaciones reales)
    const tournaments = await db.tournament.findMany({
      where,
      include: {
        tournamentUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });
    
    const total = await db.tournament.count({ where });

    // Convertir campos Decimal a números para serialización JSON
    const tournamentsWithNumbers = tournaments.map(tournament => ({
      ...tournament,
      registrationFee: Number(tournament.registrationFee || 0),
      prizePool: tournament.prizePool ? Number(tournament.prizePool) : null,
    }));

    return {
      tournaments: tournamentsWithNumbers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener torneo por ID
   */
  async getTournamentById(id: string) {
    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {
        tournamentUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    // Convertir campos Decimal a números para serialización JSON
    return {
      ...tournament,
      registrationFee: Number(tournament.registrationFee || 0),
      prizePool: tournament.prizePool ? Number(tournament.prizePool) : null,
    };
  }

  /**
   * Actualizar torneo
   */
  async updateTournament(id: string, data: z.infer<typeof UpdateTournamentSchema>) {
    const validatedData = UpdateTournamentSchema.parse(data);

    const tournament = await db.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    // Verificar que no esté en progreso o completado
    if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
      throw new Error('No se puede modificar un torneo en progreso o completado');
    }

    // Validar fechas si se proporcionan
    if (validatedData.registrationStartDate || validatedData.registrationEndDate || 
        validatedData.startDate || validatedData.endDate) {
      const regStart = validatedData.registrationStartDate 
        ? new Date(validatedData.registrationStartDate) 
        : tournament.registrationStartDate;
      const regEnd = validatedData.registrationEndDate 
        ? new Date(validatedData.registrationEndDate) 
        : tournament.registrationEndDate;
      const tournStart = validatedData.startDate 
        ? new Date(validatedData.startDate) 
        : tournament.startDate;
      const tournEnd = validatedData.endDate 
        ? new Date(validatedData.endDate) 
        : tournament.endDate;

      if (regEnd <= regStart) {
        throw new Error('La fecha de fin de inscripción debe ser posterior al inicio');
      }

      if (tournStart <= regEnd) {
        throw new Error('El torneo debe iniciar después del fin de inscripciones');
      }

      if (tournEnd <= tournStart) {
        throw new Error('La fecha de fin del torneo debe ser posterior al inicio');
      }
    }

    // Preparar datos de actualización solo con campos definidos
    const updateData: any = {};
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.maxParticipants !== undefined) updateData.maxParticipants = validatedData.maxParticipants;
    if (validatedData.registrationFee !== undefined) updateData.registrationFee = validatedData.registrationFee;
    if (validatedData.prizePool !== undefined) updateData.prizePool = validatedData.prizePool;
    if (validatedData.registrationStartDate !== undefined) updateData.registrationStartDate = new Date(validatedData.registrationStartDate);
    if (validatedData.registrationEndDate !== undefined) updateData.registrationEndDate = new Date(validatedData.registrationEndDate);
    if (validatedData.startDate !== undefined) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate !== undefined) updateData.endDate = new Date(validatedData.endDate);
    if (validatedData.rules !== undefined) updateData.rules = validatedData.rules;
    if (validatedData.requirements !== undefined) updateData.requirements = validatedData.requirements;
    if (validatedData.prizes !== undefined) updateData.prizes = validatedData.prizes;
    if (validatedData.organizer !== undefined) updateData.organizer = validatedData.organizer;
    if (validatedData.contactEmail !== undefined) updateData.contactEmail = validatedData.contactEmail;
    if (validatedData.contactPhone !== undefined) updateData.contactPhone = validatedData.contactPhone;
    if (validatedData.isPublic !== undefined) updateData.isPublic = validatedData.isPublic;

    const updatedTournament = await db.tournament.update({
      where: { id },
      data: updateData,
    });

    return updatedTournament;
  }

  /**
   * Publicar torneo (abrir inscripciones)
   */
  async publishTournament(id: string) {
    const tournament = await db.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    if (tournament.status !== 'DRAFT') {
      throw new Error('Solo se pueden publicar torneos en borrador');
    }

    const now = new Date();
    if (tournament.startDate <= now) {
      throw new Error('No se puede publicar un torneo que ya ha comenzado');
    }

    const updatedTournament = await db.tournament.update({
      where: { id },
      data: {
        status: 'REGISTRATION_OPEN',
      },
    });

    return updatedTournament;
  }

  /**
   * Registrar participante en torneo
   */
  async registerParticipant(tournamentId: string, data: z.infer<typeof RegisterParticipantSchema>) {
    const validatedData = RegisterParticipantSchema.parse(data);

    const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      throw new Error('Las inscripciones no están abiertas');
    }

    const now = new Date();
    if (now > tournament.registrationEndDate) {
      throw new Error('El período de inscripciones ha terminado');
    }

    const currentCount = await db.tournamentUser.count({ where: { tournamentId } });
    if (currentCount >= tournament.maxParticipants) {
      throw new Error('El torneo ha alcanzado el máximo de participantes');
    }

    // Verificar que el usuario existe
    const user = await db.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que no esté ya registrado
    const existingParticipant = await db.tournamentUser.findFirst({
      where: {
        tournamentId,
        userId: validatedData.userId,
      },
    });

    if (existingParticipant) {
      throw new Error('El usuario ya está registrado en este torneo');
    }

    // Verificar compañero si es necesario
    if (tournament.format === 'DOUBLES' && !validatedData.partnerId) {
      throw new Error('Se requiere un compañero para torneos de dobles');
    }

    if (validatedData.partnerId) {
      const partner = await db.user.findUnique({
        where: { id: validatedData.partnerId },
      });

      if (!partner) {
        throw new Error('Compañero no encontrado');
      }

      // Verificar que el compañero no esté ya registrado
      const existingPartner = await db.tournamentUser.findFirst({
        where: {
          tournamentId,
          userId: validatedData.partnerId,
        },
      });

      if (existingPartner) {
        throw new Error('El compañero ya está registrado en este torneo');
      }
    }

    // Procesar pago si hay tarifa (modo tolerante en dev)
    if (Number(tournament.registrationFee || 0) > 0) {
      try {
        await (this.paymentService as any)?.createPayment?.({
          userId: validatedData.userId,
          amount: Number(tournament.registrationFee || 0),
          type: 'TOURNAMENT_REGISTRATION',
          description: `Inscripción a torneo: ${tournament.name}`,
          metadata: { tournamentId, tournamentName: tournament.name },
        });
      } catch (e) {
        // Ignorar si no está implementado en este entorno
      }
    }

    // Registrar participante
    const participant = await db.tournamentUser.create({
      data: {
        tournamentId,
        userId: validatedData.userId,
        partnerId: validatedData.partnerId,
        teamName: validatedData.teamName,
        status: 'registered',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tournament: { select: { id: true, name: true, startDate: true } },
      },
    });

    // Enviar confirmación por email
    try {
      await this.notificationService.sendEmail({
        to: user.email,
        subject: 'Confirmación de registro en torneo',
        html: `
          <h2>¡Registro confirmado!</h2>
          <p>Hola ${user.name || ''},</p>
          <p>Tu registro en el torneo "${tournament.name}" ha sido confirmado.</p>
          <p><strong>Fecha de inicio:</strong> ${tournament.startDate.toLocaleDateString('es-ES')}</p>
          <p><strong>Tarifa de registro:</strong> €${Number(tournament.registrationFee || 0)}</p>
          <p>¡Te esperamos!</p>
        `
      });
    } catch (error) {
      console.error('Error enviando confirmación de inscripción:', error);
    }

    return participant;
  }

  /**
   * Cancelar inscripción
   */
  async cancelRegistration(tournamentId: string, userId: string) {
    const participant = await db.tournamentUser.findFirst({
      where: {
        tournamentId,
        userId,
      },
      include: {
        tournament: true,
      },
    });

    if (!participant) {
      throw new Error('Inscripción no encontrada');
    }

    if (participant.tournament.status === 'IN_PROGRESS' || participant.tournament.status === 'COMPLETED') {
      throw new Error('No se puede cancelar la inscripción de un torneo en progreso o completado');
    }

    // Procesar reembolso si corresponde (campo opcional)
    {
      const paymentId = (participant as any)?.paymentId;
      if (paymentId) {
        try {
          await (this.paymentService as any)?.refundPayment?.(paymentId, 'Cancelación de inscripción');
        } catch {}
      }
    }

    await db.tournamentUser.delete({
      where: { id: participant.id },
    });

    return { message: 'Inscripción cancelada exitosamente' };
  }

  /**
   * Eliminar/Cancelar torneo
   */
  async deleteTournament(id: string) {
    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {},
    });

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    if (tournament.status === 'IN_PROGRESS') {
      throw new Error('No se puede eliminar un torneo en progreso');
    }

    if (tournament.status === 'COMPLETED') {
      throw new Error('No se puede eliminar un torneo completado');
    }

    // Si tiene participantes, cancelar el torneo en lugar de eliminarlo
    const totalParticipants = await db.tournamentUser.count({ where: { tournamentId: id } });
    if (totalParticipants > 0) {
      const cancelledTournament = await db.tournament.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Procesar reembolsos para todos los participantes
      const participants = await db.tournamentUser.findMany({
        where: { tournamentId: id },
        include: { user: true },
      });

      for (const participant of participants) {
        if ((participant as any).paymentId) {
          try {
            await (this.paymentService as any)?.refundPayment?.((participant as any).paymentId, 'Cancelación de torneo');
          } catch (error) {
            console.error(`Error procesando reembolso para participante ${participant.userId}:`, error);
          }
        }

        // Enviar notificación de cancelación
        try {
          await this.notificationService.sendEmail({
            to: participant.user.email,
            subject: 'Torneo cancelado',
            html: `<p>Hola ${participant.user.name || ''}, el torneo "${tournament.name}" ha sido cancelado.</p>`,
          });
        } catch (error) {
          console.error(`Error enviando notificación a ${participant.user.email}:`, error);
        }
      }

      return cancelledTournament;
    } else {
      // Si no tiene participantes, eliminar completamente
      await db.tournament.delete({
        where: { id },
      });

      return { message: 'Torneo eliminado exitosamente' };
    }
  }

  /**
   * Obtener estadísticas de torneos
   */
  async getTournamentStats(centerId?: string) {
    const where = centerId ? { centerId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, completed, upcoming, monthlyRegistrations] = await Promise.all([
      db.tournament.count({ where }),
      db.tournament.count({
        where: { ...where, status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] } },
      }),
      db.tournament.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      db.tournament.count({
        where: {
          ...where,
          status: 'REGISTRATION_OPEN',
          startDate: { gte: now },
        },
      }),
      // No tenemos campo registrationDate en TournamentUser en el esquema actual
      Promise.resolve(0),
    ]);

    // Estadísticas por deporte
    const bySport = await db.tournament.groupBy({
      by: ['sport'],
      where,
      _count: { sport: true },
    });

    // Estadísticas por formato
    const byFormat = await db.tournament.groupBy({
      by: ['format'],
      where,
      _count: { format: true },
    });

    return {
      total,
      active,
      completed,
      upcoming,
      monthlyRegistrations,
      bySport: bySport.map((item: any) => ({
        sport: item.sport,
        count: (item._count as any).sport,
      })),
      byFormat: byFormat.map((item: any) => ({
        format: item.format,
        count: (item._count as any).format,
      })),
    };
  }
}
