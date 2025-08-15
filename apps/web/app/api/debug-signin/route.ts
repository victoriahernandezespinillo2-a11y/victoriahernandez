import { NextRequest, NextResponse } from 'next/server';
import { determineUserRole, validateAdminEmail, validateStaffDomain, SECURITY_CONFIG } from '@repo/auth/providers';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG SIGNIN CALLBACK ===');
    
    const body = await request.json();
    const { email, userRole, provider } = body;
    
    console.log('📧 Email:', email);
    console.log('👤 User Role:', userRole);
    console.log('🔐 Provider:', provider);
    
    // Simular las validaciones del callback signIn
    const expectedRole = determineUserRole(email);
    console.log('🎯 Expected Role:', expectedRole);
    
    const isAdminEmail = validateAdminEmail(email);
    console.log('👑 Is Admin Email:', isAdminEmail);
    
    const isStaffDomain = validateStaffDomain(email);
    console.log('🏢 Is Staff Domain:', isStaffDomain);
    
    const isProviderAllowed = SECURITY_CONFIG.allowedProviders.includes(provider);
    console.log('✅ Is Provider Allowed:', isProviderAllowed);
    
    // Validaciones específicas
    let validationResults = {
      emailExists: !!email,
      providerAllowed: isProviderAllowed,
      adminValidation: true,
      staffValidation: true,
      overallResult: true
    };
    
    if (!email) {
      validationResults.emailExists = false;
      validationResults.overallResult = false;
    }
    
    if (!isProviderAllowed) {
      validationResults.providerAllowed = false;
      validationResults.overallResult = false;
    }
    
    // Validaciones específicas para Google OAuth
    if (provider === 'google') {
      // Verificar autorización basada en rol
      if (userRole === 'admin' && !validateAdminEmail(email)) {
        validationResults.adminValidation = false;
        validationResults.overallResult = false;
        console.log('❌ Admin validation failed: user has admin role but email is not in admin list');
      }
      
      if (userRole === 'staff' && !validateStaffDomain(email) && !validateAdminEmail(email)) {
        validationResults.staffValidation = false;
        validationResults.overallResult = false;
        console.log('❌ Staff validation failed: user has staff role but email domain is not allowed');
      }
    }
    
    console.log('🔍 Validation Results:', validationResults);
    
    return NextResponse.json({
      success: true,
      email,
      userRole,
      expectedRole,
      provider,
      validations: {
        isAdminEmail,
        isStaffDomain,
        isProviderAllowed
      },
      validationResults,
      securityConfig: SECURITY_CONFIG
    });
    
  } catch (error) {
    console.error('Error en debug signin:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}