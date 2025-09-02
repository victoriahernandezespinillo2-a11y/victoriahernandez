/**
 * POST /api/debug/fix-user-sync
 * Endpoint para forzar la sincronización del usuario
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
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

    // 🔍 BUSCAR EL USUARIO CORRECTO EN LA BASE DE DATOS
    const correctUser = await db.user.findFirst({
      where: { 
        email: currentUserEmail,
        id: { not: currentUserId } // Excluir el usuario actual de la sesión
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
      }
    });

    if (!correctUser) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró usuario alternativo para sincronizar',
        timestamp: new Date().toISOString(),
        currentSession: {
          userId: currentUserId,
          email: currentUserEmail
        }
      });
    }

    // 🔍 VERIFICAR QUE EL USUARIO CORRECTO TENGA RESERVAS
    const userReservations = await db.reservation.findMany({
      where: { userId: correctUser.id },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
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
      message: 'Usuario correcto encontrado para sincronización',
      timestamp: new Date().toISOString(),
      currentSession: {
        userId: currentUserId,
        email: currentUserEmail,
        existsInDatabase: false
      },
      correctUser: {
        id: correctUser.id,
        email: correctUser.email,
        name: correctUser.name,
        firstName: correctUser.firstName,
        lastName: correctUser.lastName,
        createdAt: correctUser.createdAt,
        updatedAt: correctUser.updatedAt,
        reservationCount: correctUser._count.reservations
      },
      userReservations: userReservations.map(r => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        courtName: r.court.name
      })),
      recommendation: 'Hacer logout y login nuevamente para sincronizar con el usuario correcto'
    });

  } catch (error) {
    console.error('🚨 [DEBUG-FIX-USER-SYNC] Error en diagnóstico:', error);
    
    return NextResponse.json(
      { 
        error: 'Error en diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}











