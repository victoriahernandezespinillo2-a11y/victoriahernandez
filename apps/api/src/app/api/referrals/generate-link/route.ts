/**
 * @file API endpoint para generar enlaces de referido
 * @description Permite a los usuarios generar enlaces únicos para invitar amigos
 * @route GET /api/referrals/generate-link
 * @requires Authentication
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/generate-link
 * Generar enlace de referido para el usuario autenticado
 * 
 * @returns {Promise<NextResponse>} Enlace de referido generado
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 [REFERRAL-LINK] Generando enlace de referido');

    // Obtener usuario autenticado
    const user = await getAuthUser(request);
    if (!user) {
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    console.log('👤 [REFERRAL-LINK] Usuario:', user.email);

    // Obtener usuario completo de la base de datos
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        referralCode: true,
        firstName: true,
        lastName: true
      }
    });

    if (!userData) {
      return ApiResponse.notFound('Usuario no encontrado');
    }

    // Si no tiene código de referido, generar uno
    let referralCode = userData.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
      
      await db.user.update({
        where: { id: user.id },
        data: { referralCode }
      });

      console.log('✅ [REFERRAL-LINK] Código generado:', referralCode);
    }

    // Generar enlaces de referido
    // Usar WEB_APP_URL si está disponible, sino usar NEXTAUTH_URL, sino usar localhost:3000
    const baseUrl = process.env.WEB_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Si baseUrl termina con :3002 (puerto de API), usar :3000 (puerto de web)
    const webUrl = baseUrl.replace(':3002', ':3000');
    
    const referralLinks = {
      direct: `${webUrl}/auth/signup?ref=${referralCode}`,
      share: `${webUrl}/auth/signup?ref=${referralCode}`,
      code: referralCode
    };

    console.log('🔗 [REFERRAL-LINK] Enlaces generados:', referralLinks);

    return ApiResponse.success({
      referralCode,
      referralLinks,
      user: {
        id: userData.id,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email
      }
    });

  } catch (error) {
    console.error('❌ [REFERRAL-LINK] Error:', error);
    return ApiResponse.internalError('Error generando enlace de referido');
  }
}

/**
 * Generar código de referido único
 * 
 * @returns {string} Código único de 8 caracteres
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
