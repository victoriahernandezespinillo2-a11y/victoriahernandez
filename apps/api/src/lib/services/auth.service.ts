/**
 * Servicio de Autenticación
 * Maneja registro, login, sesiones y gestión de tokens
 */

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { db } from '@repo/db';
import { NotificationService } from './notification.service';

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
  })
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
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
        emailVerified: false
      }
    });

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Enviar email de verificación
    await this.sendVerificationEmail(user);

    // Actualizar último login
    await this.updateLastLogin(user.id);

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
        where: { id: resetToken.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      }),
      // Invalidar todos los refresh tokens del usuario
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId }
      })
    ]);

    // Enviar notificación de cambio de contraseña
    await this.sendPasswordChangedNotification(resetToken.user);
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
}

export default AuthService;
