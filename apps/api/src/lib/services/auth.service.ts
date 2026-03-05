/**
 * Servicio de Autenticación
 * Maneja registro, login, sesiones y gestión de tokens
 */

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { db } from '@repo/db';
import { NotificationService } from './notification.service';
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

const prisma = db;
const notificationService = new NotificationService();

// Schemas de validación
export const SignUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Debe aceptar los términos y condiciones'
  }),
  referredBy: z.string().optional() // Código de referido del usuario que invita
});

export const SignInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  rememberMe: z.boolean().optional().default(false)
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirmación de contraseña requerida')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirmación de contraseña requerida')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido')
});

// Tipos
export type SignUpData = z.infer<typeof SignUpSchema>;
export type SignInData = z.infer<typeof SignInSchema>;
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type RefreshTokenData = z.infer<typeof RefreshTokenSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'STAFF' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  phone?: string;
  avatar?: string;
  lastLoginAt?: Date;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET;
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private readonly BCRYPT_ROUNDS = 12;

  /**
   * Registrar nuevo usuario
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    const validatedData = SignUpSchema.parse(data);

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      throw new Error('El usuario ya existe con este email');
    }

    // Verificar referido si se proporciona código
    let referrerId = null;
    if (validatedData.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: validatedData.referredBy }
      });

      if (referrer) {
        referrerId = referrer.id;
        console.log('🎯 [SIGNUP] Usuario referido por:', referrer.email);
      } else {
        console.log('⚠️ [SIGNUP] Código de referido inválido:', validatedData.referredBy);
        // No fallar el registro si el código es inválido
      }
    }

    // Generar código de referido único
    const referralCode = this.generateReferralCode();

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, this.BCRYPT_ROUNDS);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        role: 'USER',
        isActive: true,
        emailVerified: false,
        referredBy: referrerId,
        referralCode: referralCode
      }
    });

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Enviar email de verificación (tolerante a fallos del proveedor)
    try {
      await this.sendVerificationEmail(user);
    } catch (emailError) {
      console.error('⚠️ [SIGNUP] Error enviando email de verificación (continuando registro):', emailError);
    }

    // Actualizar último login
    await this.updateLastLogin(user.id);

    // ✨ Aplicar SIGNUP_BONUS automáticamente si existe
    try {
      await this.applySignupBonus(user.id);
    } catch (promoError) {
      console.error('⚠️ [SIGNUP] Error aplicando SIGNUP_BONUS (no crítico):', promoError);
      // No fallar el registro si falla la promoción
    }

    // ✨ Aplicar REFERRAL_BONUS si fue referido por alguien
    if (referrerId) {
      try {
        await this.applyReferralBonus(referrerId, user.id);
      } catch (referralError) {
        console.error('⚠️ [SIGNUP] Error aplicando REFERRAL_BONUS (no crítico):', referralError);
        // No fallar el registro si falla la promoción de referido
      }
    }

    return {
      user: this.formatUser(user),
      tokens
    };
  }

  /**
   * Iniciar sesión
   */
  async signIn(data: SignInData): Promise<AuthResponse> {
    const validatedData = SignInSchema.parse(data);

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new Error('Cuenta desactivada. Contacte al administrador');
    }

    // Verificar contraseña
    if (!user.password) {
      throw new Error('Credenciales inválidas');
    }
    const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar tokens
    const tokens = await this.generateTokens(user, validatedData.rememberMe);

    // Actualizar último login
    await this.updateLastLogin(user.id);

    return {
      user: this.formatUser(user),
      tokens
    };
  }

  /**
   * Cerrar sesión
   */
  async signOut(refreshToken: string): Promise<void> {
    try {
      // Verificar y decodificar el refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET as jwt.Secret) as any;

      // Invalidar el refresh token en la base de datos
      await prisma.refreshToken.deleteMany({
        where: {
          userId: decoded.userId,
          token: refreshToken
        }
      });
    } catch (error) {
      // Token inválido o expirado, no hacer nada
    }
  }

  /**
   * Renovar tokens
   */
  async refreshTokens(data: RefreshTokenData): Promise<AuthTokens> {
    const validatedData = RefreshTokenSchema.parse(data);

    try {
      // Verificar refresh token
      const decoded = jwt.verify(validatedData.refreshToken, this.JWT_REFRESH_SECRET as jwt.Secret) as any;

      // Verificar que el token existe en la base de datos
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: validatedData.refreshToken,
          userId: decoded.userId,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      });

      if (!storedToken) {
        throw new Error('Refresh token inválido o expirado');
      }

      // Verificar que el usuario sigue activo
      if (!storedToken.user.isActive) {
        throw new Error('Usuario desactivado');
      }

      // Generar nuevos tokens
      const newTokens = await this.generateTokens(storedToken.user);

      // Eliminar el refresh token usado
      await prisma.refreshToken.delete({
        where: { id: storedToken.id }
      });

      return newTokens;
    } catch (error) {
      throw new Error('Refresh token inválido o expirado');
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async forgotPassword(data: ForgotPasswordData): Promise<void> {
    const validatedData = ForgotPasswordSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      // Por seguridad, no revelar si el email existe
      return;
    }

    // Generar token de restablecimiento
    const resetToken = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en la base de datos
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt
      }
    });

    // Enviar email de restablecimiento
    await this.sendPasswordResetEmail(user, resetToken);
  }

  /**
   * Restablecer contraseña
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    const validatedData = ResetPasswordSchema.parse(data);

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: validatedData.token,
        expiresAt: {
          gt: new Date()
        },
        usedAt: null
      },
      include: {
        user: true
      }
    });

    if (!resetToken) {
      throw new Error('Token de restablecimiento inválido o expirado');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, this.BCRYPT_ROUNDS);

    // Actualizar contraseña y marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      }),
      // Invalidar todos los refresh tokens del usuario
      prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      })
    ]);

    // Intentar actualizar también en Firebase si está configurado
    if (user.firebaseUid && isFirebaseAdminConfigured()) {
      try {
        const auth = getFirebaseAdminAuth();
        await auth.updateUser(user.firebaseUid, {
          password: validatedData.password
        });
        console.log(`[AuthService] Contraseña sincronizada con Firebase para uid: ${user.firebaseUid}`);
      } catch (fbError) {
        console.error(`[AuthService] Error al sincronizar contraseña de reset con Firebase para firebaseUid ${user.firebaseUid}:`, fbError);
        // Continuamos para no romper el flujo principal, ya que se guardó en DB
      }
    }

    // Enviar notificación de cambio de contraseña
    await this.sendPasswordChangedNotification(resetToken.user);
  }

  /**
   * Establecer contraseña inicial (activación de cuenta)
   * Similar a resetPassword pero también activa la cuenta y verifica el email
   */
  async setInitialPassword(data: ResetPasswordData): Promise<void> {
    const validatedData = ResetPasswordSchema.parse(data);

    // Buscar token válido
    const activationToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: validatedData.token,
        expiresAt: {
          gt: new Date()
        },
        usedAt: null
      },
      include: {
        user: true
      }
    });

    if (!activationToken) {
      throw new Error('Token de activación inválido o expirado');
    }

    const user = activationToken.user;

    // Verificar que el usuario no tenga contraseña ya establecida (solo para activación inicial)
    if (user.password) {
      throw new Error('Esta cuenta ya tiene una contraseña establecida. Usa "Olvidé mi contraseña" si la necesitas restablecer.');
    }

    // Validar fortaleza de contraseña
    if (validatedData.password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, this.BCRYPT_ROUNDS);

    // Actualizar usuario: establecer contraseña, activar cuenta y verificar email
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: activationToken.id },
        data: { usedAt: new Date() }
      }),
      // Limpiar cualquier token de activación previo no usado
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: { not: activationToken.id }
        }
      })
    ]);

    // Intentar actualizar también en Firebase si está configurado
    if (user.firebaseUid && isFirebaseAdminConfigured()) {
      try {
        const auth = getFirebaseAdminAuth();
        await auth.updateUser(user.firebaseUid, {
          password: validatedData.password
        });
        console.log(`[AuthService] Contraseña inicial sincronizada con Firebase para uid: ${user.firebaseUid}`);
      } catch (fbError) {
        console.error(`[AuthService] Error al sincronizar la contraseña inicial con Firebase para firebaseUid ${user.firebaseUid}:`, fbError);
        // Continuamos para no romper el flujo principal
      }
    }

    // Enviar notificación de activación exitosa
    try {
      const { NotificationService } = await import('@repo/notifications');
      const notificationService = new NotificationService();

      await notificationService.sendEmail({
        to: user.email,
        subject: 'Cuenta activada exitosamente',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hola <strong>${user.firstName || user.name || 'Usuario'}</strong>,</p>
            <p>Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión con tu email y la contraseña que acabas de establecer.</p>
            <p>¡Bienvenido a Polideportivo Victoria Hernández!</p>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Error enviando email de confirmación de activación:', emailError);
      // No fallar la activación si falla el email
    }
  }

  /**
   * Cambiar contraseña (usuario autenticado)
   */
  async changePassword(userId: string, data: ChangePasswordData): Promise<void> {
    const validatedData = ChangePasswordSchema.parse(data);

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual
    if (!user.password) {
      throw new Error('Contraseña actual incorrecta');
    }
    const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, this.BCRYPT_ROUNDS);

    // Actualizar contraseña
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      }),
      // Invalidar todos los refresh tokens excepto el actual
      prisma.refreshToken.deleteMany({
        where: { userId }
      })
    ]);

    // Enviar notificación de cambio de contraseña
    await this.sendPasswordChangedNotification(user);
  }

  /**
   * Verificar email
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET as jwt.Secret) as any;

      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      });
    } catch (error) {
      throw new Error('Token de verificación inválido o expirado');
    }
  }

  /**
   * Reenviar email de verificación
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new Error('El email ya está verificado');
    }

    await this.sendVerificationEmail(user);
  }

  /**
   * Obtener información del usuario por token
   */
  async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      if (!this.JWT_SECRET) {
        throw new Error('JWT_SECRET no está configurado');
      }
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      const userId = decoded.userId || decoded.id || decoded.sub;
      const email = decoded.email;

      let user = null;

      // 1. Intentar buscar por ID (método preferido)
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId }
        });
      }

      // 2. Si no se encuentra por ID, intentar buscar por email (fallback)
      if (!user && email) {
        user = await prisma.user.findUnique({
          where: { email: email }
        });
      }

      if (!user || !user.isActive) {
        return null;
      }

      return this.formatUser(user);
    } catch (error) {
      console.error('❌ [AUTH-SERVICE] Error al validar token JWT:', error);
      return null;
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return null;
    return this.formatUser(user);
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;
    return this.formatUser(user);
  }

  /**
   * Asegurar existencia de usuario por email. Si no existe, lo crea como USER activo.
   */
  async ensureUserByEmail(email: string, name?: string, roleHint?: string): Promise<AuthUser> {
    const existing = await prisma.user.findUnique({ where: { email } });
    // Determinar rol sugerido de forma segura
    const normalizedHint = typeof roleHint === 'string' ? roleHint.toUpperCase() : '';
    const roleOrder = { USER: 0, STAFF: 1, ADMIN: 2 } as const;
    const hintedRole = (normalizedHint === 'ADMIN' || normalizedHint === 'STAFF') ? (normalizedHint as any) : ('USER' as any);

    if (existing && existing.isActive) {
      // Sincronizar rol si el hint es superior (promoción automática segura)
      const currentRole = (existing.role as any) || 'USER';
      if (roleOrder[currentRole as keyof typeof roleOrder] < roleOrder[hintedRole as keyof typeof roleOrder]) {
        const updated = await prisma.user.update({ where: { id: existing.id }, data: { role: hintedRole } });
        return this.formatUser(updated);
      }
      return this.formatUser(existing);
    }
    const [firstName, ...rest] = (name || '').split(' ');
    const lastName = rest.join(' ') || null as any;
    // Determinar rol inicial de forma segura a partir de la pista del token
    // Solo aceptar ADMIN/STAFF explícitos; por defecto USER
    const initialRole = hintedRole;
    const created = await prisma.user.create({
      data: {
        email,
        name: name || null,
        firstName: firstName || null as any,
        lastName: lastName,
        role: initialRole,
        isActive: true,
        emailVerified: true,
      },
    });
    return this.formatUser(created);
  }

  /**
   * Generar tokens de acceso y refresh
   */
  private async generateTokens(user: any, rememberMe = false): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Access token
    const accessToken = jwt.sign(payload, this.JWT_SECRET as jwt.Secret, {
      expiresIn: this.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });

    // Refresh token
    const refreshTokenExpiry = rememberMe ? '30d' : this.JWT_REFRESH_EXPIRES_IN;
    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET as jwt.Secret, {
      expiresIn: refreshTokenExpiry as jwt.SignOptions['expiresIn']
    });

    // Guardar refresh token en la base de datos
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutos en segundos
    };
  }

  /**
   * Generar token de restablecimiento
   */
  private generateResetToken(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  /**
   * Actualizar último login
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  /**
   * Formatear usuario para respuesta
   */
  private formatUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      lastLoginAt: user.lastLoginAt || undefined
    };
  }

  /**
   * Enviar email de verificación
   */
  private async sendVerificationEmail(user: any): Promise<void> {
    const verificationToken = jwt.sign({ userId: user.id }, this.JWT_SECRET as jwt.Secret, { expiresIn: '24h' });

    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    await notificationService.sendEmail({
      to: user.email,
      subject: 'Verificar tu cuenta - Polideportivo Victoria Hernández',
      template: 'email-verification',
      data: {
        firstName: user.firstName,
        verificationUrl
      }
    });
  }

  /**
   * Enviar email de restablecimiento de contraseña
   */
  private async sendPasswordResetEmail(user: any, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    await notificationService.sendEmail({
      to: user.email,
      subject: 'Restablecer contraseña - Polideportivo Victoria Hernández',
      template: 'password-reset',
      data: {
        firstName: user.firstName,
        resetUrl
      }
    });
  }

  /**
   * Enviar notificación de cambio de contraseña
   */
  private async sendPasswordChangedNotification(user: any): Promise<void> {
    await notificationService.sendEmail({
      to: user.email,
      subject: 'Contraseña cambiada - Polideportivo Victoria Hernández',
      template: 'password-changed',
      data: {
        firstName: user.firstName,
        changeTime: new Date().toLocaleString('es-ES')
      }
    });
  }

  /**
   * Aplicar SIGNUP_BONUS automáticamente al registrarse
   * 
   * @description Busca promociones SIGNUP_BONUS activas y las aplica automáticamente
   * al nuevo usuario, otorgando créditos de bienvenida.
   * 
   * @param {string} userId - ID del usuario recién registrado
   * 
   * @returns {Promise<void>}
   * 
   * @throws No lanza errores (se registran pero no interrumpen el flujo)
   */
  private async applySignupBonus(userId: string): Promise<void> {
    console.log('🎁 [SIGNUP-BONUS] Verificando bonus de registro para usuario:', userId);

    try {
      const now = new Date();

      // Buscar SIGNUP_BONUS activo
      const signupPromotion = await prisma.promotion.findFirst({
        where: {
          type: 'SIGNUP_BONUS',
          status: 'ACTIVE',
          validFrom: { lte: now },
          OR: [
            { validTo: null },
            { validTo: { gte: now } }
          ]
        }
      });

      if (!signupPromotion) {
        console.log('ℹ️ [SIGNUP-BONUS] No hay promoción SIGNUP_BONUS activa');
        return;
      }

      console.log('✅ [SIGNUP-BONUS] Promoción encontrada:', {
        id: signupPromotion.id,
        name: signupPromotion.name
      });

      // Verificar límite de uso global
      if (signupPromotion.usageLimit && signupPromotion.usageCount >= signupPromotion.usageLimit) {
        console.log('⚠️ [SIGNUP-BONUS] Límite de uso alcanzado');
        return;
      }

      const rewards = signupPromotion.rewards as any;

      // Solo procesar si es FIXED_CREDITS (único tipo válido para SIGNUP_BONUS)
      if (rewards.type !== 'FIXED_CREDITS') {
        console.log('⚠️ [SIGNUP-BONUS] Tipo de recompensa inválido:', rewards.type);
        return;
      }

      const creditsAwarded = rewards.value;

      console.log('💰 [SIGNUP-BONUS] Otorgando créditos:', creditsAwarded);

      // Transacción atómica para aplicar la promoción
      await prisma.$transaction(async (tx) => {
        // Registrar aplicación
        await tx.promotionApplication.create({
          data: {
            promotionId: signupPromotion.id,
            userId,
            creditsAwarded,
            metadata: {
              autoApplied: true,
              reason: 'SIGNUP',
              appliedAt: now.toISOString()
            }
          }
        });

        // Incrementar contador de uso
        await tx.promotion.update({
          where: { id: signupPromotion.id },
          data: { usageCount: { increment: 1 } }
        });

        // Actualizar balance del usuario
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { creditsBalance: { increment: creditsAwarded } }
        });

        // Registrar en wallet ledger
        await tx.walletLedger.create({
          data: {
            userId,
            type: 'CREDIT',
            reason: 'TOPUP',
            credits: creditsAwarded,
            balanceAfter: updatedUser.creditsBalance,
            metadata: {
              promotionId: signupPromotion.id,
              promotionName: signupPromotion.name,
              promotionType: 'SIGNUP_BONUS',
              autoApplied: true
            },
            idempotencyKey: `SIGNUP_BONUS:${userId}:${signupPromotion.id}`
          }
        });

        console.log('✅ [SIGNUP-BONUS] Promoción aplicada exitosamente:', {
          userId,
          creditsAwarded,
          newBalance: Number(updatedUser.creditsBalance)
        });
      });

    } catch (error) {
      console.error('❌ [SIGNUP-BONUS] Error aplicando promoción:', error);
      // No relanzar el error para no interrumpir el registro
    }
  }

  /**
   * Generar código de referido único
   * 
   * @returns {string} Código único de 8 caracteres
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Aplicar REFERRAL_BONUS automáticamente al referidor
   * 
   * @description Busca promociones REFERRAL_BONUS activas y las aplica automáticamente
   * al usuario que hizo la referencia cuando alguien se registra usando su código.
   * 
   * @param {string} referrerId - ID del usuario que hizo la referencia
   * @param {string} referredUserId - ID del usuario recién registrado que fue referido
   * 
   * @returns {Promise<void>}
   * 
   * @throws No lanza errores (se registran pero no interrumpen el flujo)
   */
  private async applyReferralBonus(referrerId: string, referredUserId: string): Promise<void> {
    console.log('🎁 [REFERRAL-BONUS] Verificando bonus de referido para:', referrerId);

    try {
      const now = new Date();

      // Buscar REFERRAL_BONUS activo
      const referralPromotion = await prisma.promotion.findFirst({
        where: {
          type: 'REFERRAL_BONUS',
          status: 'ACTIVE',
          validFrom: { lte: now },
          OR: [
            { validTo: null },
            { validTo: { gte: now } }
          ]
        }
      });

      if (!referralPromotion) {
        console.log('ℹ️ [REFERRAL-BONUS] No hay promoción REFERRAL_BONUS activa');
        return;
      }

      console.log('✅ [REFERRAL-BONUS] Promoción encontrada:', {
        id: referralPromotion.id,
        name: referralPromotion.name
      });

      // Verificar límite de uso global
      if (referralPromotion.usageLimit && referralPromotion.usageCount >= referralPromotion.usageLimit) {
        console.log('⚠️ [REFERRAL-BONUS] Límite de uso alcanzado');
        return;
      }

      // Verificar si el referidor ya usó esta promoción
      const existingApplication = await prisma.promotionApplication.findFirst({
        where: {
          promotionId: referralPromotion.id,
          userId: referrerId
        }
      });

      if (existingApplication) {
        console.log('⚠️ [REFERRAL-BONUS] Referidor ya usó esta promoción');
        return;
      }

      const rewards = referralPromotion.rewards as any;

      // Solo procesar si es FIXED_CREDITS (único tipo válido para REFERRAL_BONUS)
      if (rewards.type !== 'FIXED_CREDITS') {
        console.log('⚠️ [REFERRAL-BONUS] Tipo de recompensa inválido:', rewards.type);
        return;
      }

      const creditsAwarded = rewards.value;

      console.log('💰 [REFERRAL-BONUS] Otorgando créditos al referidor:', creditsAwarded);

      // Transacción atómica para aplicar la promoción
      await prisma.$transaction(async (tx) => {
        // Registrar aplicación
        await tx.promotionApplication.create({
          data: {
            promotionId: referralPromotion.id,
            userId: referrerId,
            creditsAwarded,
            metadata: {
              autoApplied: true,
              reason: 'REFERRAL',
              referredUserId,
              appliedAt: now.toISOString()
            }
          }
        });

        // Incrementar contador de uso
        await tx.promotion.update({
          where: { id: referralPromotion.id },
          data: { usageCount: { increment: 1 } }
        });

        // Actualizar balance del referidor
        const updatedUser = await tx.user.update({
          where: { id: referrerId },
          data: { creditsBalance: { increment: creditsAwarded } }
        });

        // Registrar en wallet ledger
        await tx.walletLedger.create({
          data: {
            userId: referrerId,
            type: 'CREDIT',
            reason: 'TOPUP',
            credits: creditsAwarded,
            balanceAfter: updatedUser.creditsBalance,
            metadata: {
              promotionId: referralPromotion.id,
              promotionName: referralPromotion.name,
              promotionType: 'REFERRAL_BONUS',
              autoApplied: true,
              referredUserId
            },
            idempotencyKey: `REFERRAL_BONUS:${referrerId}:${referralPromotion.id}:${referredUserId}`
          }
        });

        console.log('✅ [REFERRAL-BONUS] Promoción aplicada exitosamente:', {
          referrerId,
          referredUserId,
          creditsAwarded,
          newBalance: Number(updatedUser.creditsBalance)
        });
      });

    } catch (error) {
      console.error('❌ [REFERRAL-BONUS] Error aplicando promoción:', error);
      // No relanzar el error para no interrumpir el registro
    }
  }
}

export default AuthService;
