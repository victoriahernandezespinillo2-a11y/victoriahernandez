/**
 * GET /api/debug/reservations-august-23
 * Endpoint de diagnóstico para verificar reservas del 23 de agosto
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

    const userId = session.user.id;
    const targetDate = new Date('2025-08-23');
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 🔍 CONSULTAR TODAS LAS RESERVAS DEL 23 DE AGOSTO
    const allReservations = await db.reservation.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        court: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // 🔍 CONSULTAR RESERVAS DEL USUARIO ACTUAL
    const userReservations = await db.reservation.findMany({
      where: {
        userId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'] }
      },
      include: {
        court: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // 🔍 CONSULTAR RESERVAS EN TENIS 2
    const tenis2Reservations = await db.reservation.findMany({
      where: {
        court: {
          name: {
            contains: 'TENIS 2',
            mode: 'insensitive'
          }
        },
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING', 'PAID', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        court: {
          select: {
            id: true,
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
      message: 'Diagnóstico de reservas del 23 de agosto',
      timestamp: new Date().toISOString(),
      targetDate: targetDate.toISOString(),
      currentUser: {
        id: userId,
        email: session.user.email,
        name: session.user.name
      },
      summary: {
        totalReservations: allReservations.length,
        userReservations: userReservations.length,
        tenis2Reservations: tenis2Reservations.length
      },
      allReservations: allReservations.map(r => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        userId: r.user.id,
        userEmail: r.user.email,
        userName: r.user.name,
        courtId: r.court.id,
        courtName: r.court.name
      })),
      userReservations: userReservations.map(r => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        courtName: r.court.name
      })),
      tenis2Reservations: tenis2Reservations.map(r => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        userId: r.user.id,
        userEmail: r.user.email,
        userName: r.user.name
      }))
    });

  } catch (error) {
    console.error('🚨 [DEBUG-RESERVATIONS] Error en diagnóstico:', error);
    
    return NextResponse.json(
      { 
        error: 'Error en diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}













