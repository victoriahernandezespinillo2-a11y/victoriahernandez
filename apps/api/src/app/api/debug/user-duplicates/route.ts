/**
 * GET /api/debug/user-duplicates
 * Endpoint para diagnosticar usuarios duplicados
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;

    // 🔍 BUSCAR TODOS LOS USUARIOS CON EL MISMO EMAIL
    const duplicateUsers = await db.user.findMany({
      where: {
        email: currentUserEmail
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            reservations: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 🔍 BUSCAR RESERVAS DE TODOS LOS USUARIOS DUPLICADOS
    const allUserReservations = await db.reservation.findMany({
      where: {
        userId: {
          in: duplicateUsers.map(u => u.id)
        }
      },
      include: {
        court: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // 🔍 AGRUPAR RESERVAS POR USUARIO
    const reservationsByUser = duplicateUsers.map(user => ({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isCurrentUser: user.id === currentUserId
      },
      reservationCount: user._count.reservations,
      reservations: allUserReservations
        .filter(r => r.userId === user.id)
        .map(r => ({
          id: r.id,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          courtName: r.court.name
        }))
    }));

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico de usuarios duplicados',
      timestamp: new Date().toISOString(),
      currentUser: {
        id: currentUserId,
        email: currentUserEmail,
        name: session.user.name
      },
      summary: {
        totalDuplicateUsers: duplicateUsers.length,
        totalReservations: allUserReservations.length
      },
      duplicateUsers: reservationsByUser
    });

  } catch (error) {
    console.error('🚨 [DEBUG-USER-DUPLICATES] Error en diagnóstico:', error);
    
    return NextResponse.json(
      { 
        error: 'Error en diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}



