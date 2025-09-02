/**
 * GET /api/debug/auth-session
 * Endpoint para diagnosticar la sesión de autenticación
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'No hay sesión activa',
        timestamp: new Date().toISOString()
      });
    }

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;

    // 🔍 BUSCAR EL USUARIO EN LA BASE DE DATOS
    const dbUser = await db.user.findUnique({
      where: { id: currentUserId },
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
      }
    });

    // 🔍 BUSCAR TODOS LOS USUARIOS CON EL MISMO EMAIL
    const allUsersWithEmail = await db.user.findMany({
      where: { email: currentUserEmail },
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

    // 🔍 BUSCAR RESERVAS DEL USUARIO ACTUAL
    const currentUserReservations = await db.reservation.findMany({
      where: { userId: currentUserId },
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

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico de sesión de autenticación',
      timestamp: new Date().toISOString(),
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      databaseUser: dbUser,
      allUsersWithEmail: allUsersWithEmail.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        reservationCount: u._count.reservations,
        isCurrentUser: u.id === currentUserId
      })),
      currentUserReservations: currentUserReservations.map(r => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        courtName: r.court.name
      })),
      summary: {
        totalUsersWithEmail: allUsersWithEmail.length,
        currentUserReservations: currentUserReservations.length,
        hasDatabaseUser: !!dbUser
      }
    });

  } catch (error) {
    console.error('🚨 [DEBUG-AUTH-SESSION] Error en diagnóstico:', error);
    
    return NextResponse.json(
      { 
        error: 'Error en diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}











