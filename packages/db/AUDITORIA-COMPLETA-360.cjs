/**
 * AUDITORÍA COMPLETA 360° - SISTEMA DE PROMOCIONES
 * Quality Assurance Exhaustivo
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class PromotionSystemAudit {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.issues = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  pass(test) {
    this.passed++;
    this.log(`  ✅ ${test}`, 'green');
  }

  fail(test, details) {
    this.failed++;
    this.log(`  ❌ ${test}`, 'red');
    if (details) this.log(`     ${details}`, 'red');
    this.issues.push({ severity: 'CRITICAL', test, details });
  }

  warn(test, details) {
    this.warnings++;
    this.log(`  ⚠️  ${test}`, 'yellow');
    if (details) this.log(`     ${details}`, 'yellow');
    this.issues.push({ severity: 'WARNING', test, details });
  }

  section(title) {
    this.log(`\n${'═'.repeat(70)}`, 'bright');
    this.log(`  ${title}`, 'bright');
    this.log('═'.repeat(70), 'bright');
  }

  subsection(title) {
    this.log(`\n📋 ${title}`, 'cyan');
  }

  // ============================================
  // 1. AUDITORÍA DE BASE DE DATOS
  // ============================================
  async auditDatabase() {
    this.section('1. AUDITORÍA DE BASE DE DATOS');

    // 1.1: Verificar enum PromotionType
    this.subsection('1.1 Enum PromotionType');
    try {
      const types = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"PromotionType"))::text as type
      `;
      
      const typesList = types.map(t => t.type);
      const expectedTypes = ['SIGNUP_BONUS', 'RECHARGE_BONUS', 'USAGE_BONUS', 'REFERRAL_BONUS', 'DISCOUNT_CODE', 'SEASONAL'];
      
      expectedTypes.forEach(expected => {
        if (typesList.includes(expected)) {
          this.pass(`Tipo ${expected} presente en DB`);
        } else {
          this.fail(`Tipo ${expected} faltante en DB`, 'Backend/Frontend lo usan pero DB no lo tiene');
        }
      });

      if (typesList.length !== expectedTypes.length) {
        this.warn('Cantidad de tipos no coincide', `DB: ${typesList.length}, Esperado: ${expectedTypes.length}`);
      }
    } catch (error) {
      this.fail('Error consultando enum PromotionType', error.message);
    }

    // 1.2: Verificar tabla Promotion
    this.subsection('1.2 Tabla Promotion');
    try {
      const promoCount = await prisma.promotion.count();
      this.pass(`Tabla promotions accesible (${promoCount} registros)`);

      // Verificar estructura de una promoción si existe
      const samplePromo = await prisma.promotion.findFirst();
      if (samplePromo) {
        const hasRequiredFields = samplePromo.id && samplePromo.name && samplePromo.type;
        if (hasRequiredFields) {
          this.pass('Campos requeridos presentes (id, name, type)');
        } else {
          this.fail('Faltan campos requeridos en tabla');
        }

        if (typeof samplePromo.conditions === 'object') {
          this.pass('Campo conditions es JSON');
        } else {
          this.fail('Campo conditions no es JSON válido');
        }

        if (typeof samplePromo.rewards === 'object') {
          this.pass('Campo rewards es JSON');
        } else {
          this.fail('Campo rewards no es JSON válido');
        }
      }
    } catch (error) {
      this.fail('Error accediendo tabla promotions', error.message);
    }

    // 1.3: Verificar tabla PromotionApplication
    this.subsection('1.3 Tabla PromotionApplication');
    try {
      const appCount = await prisma.promotionApplication.count();
      this.pass(`Tabla promotion_applications accesible (${appCount} registros)`);

      // Verificar relación con User
      const appWithUser = await prisma.promotionApplication.findFirst({
        include: { user: true, promotion: true }
      });
      if (appWithUser) {
        this.pass('Relación con User funciona');
        this.pass('Relación con Promotion funciona');
      }
    } catch (error) {
      this.fail('Error accediendo tabla promotion_applications', error.message);
    }
  }

  // ============================================
  // 2. AUDITORÍA DE BACKEND ADMIN
  // ============================================
  async auditBackendAdmin() {
    this.section('2. AUDITORÍA DE BACKEND ADMIN');

    // 2.1: Verificar archivos de rutas
    this.subsection('2.1 Archivos de Endpoints');
    const adminFiles = [
      'apps/api/src/app/api/admin/promotions/route.ts',
      'apps/api/src/app/api/admin/promotions/[id]/route.ts'
    ];

    adminFiles.forEach(file => {
      const filePath = path.join(process.cwd(), '..', '..', file);
      if (fs.existsSync(filePath)) {
        this.pass(`Archivo ${file} existe`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Verificar imports críticos
        if (content.includes('import { db }')) {
          this.pass(`  └─ Import de db presente`);
        } else {
          this.fail(`  └─ Import de db faltante`);
        }

        if (content.includes('withAdminMiddleware')) {
          this.pass(`  └─ Middleware de admin presente`);
        } else {
          this.fail(`  └─ Middleware de admin faltante`);
        }

        // Verificar los 6 tipos en el schema de validación
        if (content.includes('REFERRAL_BONUS') && content.includes('DISCOUNT_CODE')) {
          this.pass(`  └─ Nuevos tipos (REFERRAL_BONUS, DISCOUNT_CODE) presentes`);
        } else {
          this.fail(`  └─ Nuevos tipos faltantes en schema de validación`);
        }

        // Verificar documentación
        if (content.includes('@file') || content.includes('@description')) {
          this.pass(`  └─ Documentación JSDoc presente`);
        } else {
          this.warn(`  └─ Falta documentación JSDoc`, 'Mejora la mantenibilidad');
        }
      } else {
        this.fail(`Archivo ${file} NO existe`);
      }
    });
  }

  // ============================================
  // 3. AUDITORÍA DE BACKEND USUARIO
  // ============================================
  async auditBackendUser() {
    this.section('3. AUDITORÍA DE BACKEND USUARIO');

    // 3.1: Verificar endpoints de usuario
    this.subsection('3.1 Endpoints de Usuario');
    const userEndpoints = [
      'apps/api/src/app/api/promotions/validate/route.ts',
      'apps/api/src/app/api/promotions/active/route.ts',
      'apps/api/src/app/api/promotions/apply/route.ts',
      'apps/api/src/app/api/promotions/my-history/route.ts'
    ];

    userEndpoints.forEach(file => {
      const filePath = path.join(process.cwd(), '..', '..', file);
      if (fs.existsSync(filePath)) {
        this.pass(`Endpoint ${path.basename(path.dirname(file))} existe`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Verificar autenticación
        if (content.includes('getAuthUser') || content.includes('withAuthMiddleware')) {
          this.pass(`  └─ Autenticación implementada`);
        } else {
          if (file.includes('active')) {
            this.pass(`  └─ Endpoint público (no requiere auth)`);
          } else {
            this.fail(`  └─ Falta autenticación`);
          }
        }

        // Verificar manejo de errores
        if (content.includes('try {') && content.includes('catch')) {
          this.pass(`  └─ Manejo de errores implementado`);
        } else {
          this.fail(`  └─ Falta manejo de errores`);
        }

        // Verificar logging
        if (content.includes('console.log') || content.includes('console.error')) {
          this.pass(`  └─ Logging implementado`);
        } else {
          this.warn(`  └─ Falta logging`, 'Dificulta debugging');
        }
      } else {
        this.fail(`Endpoint ${file} NO existe`);
      }
    });

    // 3.2: Verificar aplicaciones automáticas
    this.subsection('3.2 Aplicaciones Automáticas');
    
    const authServicePath = path.join(process.cwd(), '..', '..', 'apps/api/src/lib/services/auth.service.ts');
    if (fs.existsSync(authServicePath)) {
      const content = fs.readFileSync(authServicePath, 'utf-8');
      
      if (content.includes('applySignupBonus') || content.includes('SIGNUP_BONUS')) {
        this.pass('SIGNUP_BONUS automático implementado en AuthService');
      } else {
        this.fail('SIGNUP_BONUS automático NO implementado');
      }
    }

    const webhookPath = path.join(process.cwd(), '..', '..', 'apps/api/src/app/api/payments/webhook/redsys/route.ts');
    if (fs.existsSync(webhookPath)) {
      const content = fs.readFileSync(webhookPath, 'utf-8');
      
      if (content.includes('applyRechargeBonus') || content.includes('RECHARGE_BONUS')) {
        this.pass('RECHARGE_BONUS automático implementado en Webhook Redsys');
      } else {
        this.fail('RECHARGE_BONUS automático NO implementado');
      }
    }

    const paymentServicePath = path.join(process.cwd(), '..', '..', 'apps/api/src/lib/services/reservation-payment.service.ts');
    if (fs.existsSync(paymentServicePath)) {
      const content = fs.readFileSync(paymentServicePath, 'utf-8');
      
      if (content.includes('applyUsageBonus') || content.includes('USAGE_BONUS')) {
        this.pass('USAGE_BONUS automático implementado en Payment Service');
      } else {
        this.fail('USAGE_BONUS automático NO implementado');
      }
    }
  }

  // ============================================
  // 4. AUDITORÍA DE FRONTEND ADMIN
  // ============================================
  async auditFrontendAdmin() {
    this.section('4. AUDITORÍA DE FRONTEND ADMIN');

    // 4.1: Verificar página de promociones
    this.subsection('4.1 Página de Promociones Admin');
    const adminPagePath = path.join(process.cwd(), 'src/app/promotions/page.tsx');
    
    if (fs.existsSync(adminPagePath)) {
      this.pass('Página /promotions existe');
      
      const content = fs.readFileSync(adminPagePath, 'utf-8');
      
      // Verificar estado de conditions
      if (content.includes('const [conditions, setConditions]')) {
        this.pass('Estado de conditions implementado');
      } else {
        this.fail('Estado de conditions faltante', 'Modal no puede configurar restricciones');
      }

      // Verificar funciones de validación
      if (content.includes('getValidRewardTypes')) {
        this.pass('Función getValidRewardTypes presente');
      } else {
        this.fail('Función de validación de coherencia faltante');
      }

      if (content.includes('getRelevantConditions')) {
        this.pass('Función getRelevantConditions presente');
      } else {
        this.fail('Función de conditions relevantes faltante');
      }

      // Verificar UI de conditions
      if (content.includes('Condiciones de Aplicación')) {
        this.pass('UI de conditions presente en modal');
      } else {
        this.fail('UI de conditions faltante', 'Promociones siempre con conditions: {}');
      }

      // Verificar campos de conditions
      const conditionFields = ['minAmount', 'maxAmount', 'minTopupAmount', 'dayOfWeek', 'timeOfDay'];
      conditionFields.forEach(field => {
        if (content.includes(`conditions.${field}`)) {
          this.pass(`  └─ Campo ${field} implementado`);
        } else {
          this.fail(`  └─ Campo ${field} faltante`);
        }
      });

      // Verificar tooltips
      if (content.includes('import { Tooltip }')) {
        this.pass('Tooltips importados');
        
        const tooltipCount = (content.match(/<Tooltip/g) || []).length;
        if (tooltipCount >= 3) {
          this.pass(`  └─ ${tooltipCount} tooltips implementados`);
        } else {
          this.warn(`  └─ Solo ${tooltipCount} tooltips`, 'Se recomienda más ayuda contextual');
        }
      } else {
        this.warn('Tooltips no implementados', 'Falta ayuda contextual para usuarios');
      }

      // Verificar los 6 tipos de promoción en el select
      const promotionTypes = ['SIGNUP_BONUS', 'RECHARGE_BONUS', 'USAGE_BONUS', 'REFERRAL_BONUS', 'DISCOUNT_CODE', 'SEASONAL'];
      promotionTypes.forEach(type => {
        if (content.includes(`value="${type}"`)) {
          this.pass(`  └─ Tipo ${type} en dropdown`);
        } else {
          this.fail(`  └─ Tipo ${type} faltante en dropdown`);
        }
      });

      // Verificar filtrado dinámico de recompensas
      if (content.includes('getValidRewardTypes(newPromotion.type).includes')) {
        this.pass('Filtrado dinámico de recompensas implementado');
      } else {
        this.fail('Filtrado dinámico faltante', 'Permite combinaciones inválidas');
      }

      // Verificar auto-ajuste
      if (content.includes('useEffect') && content.includes('[newPromotion.type]')) {
        this.pass('Auto-ajuste de rewardType implementado');
      } else {
        this.warn('Auto-ajuste faltante', 'UX podría mejorar');
      }
    } else {
      this.fail('Página admin/promotions NO existe');
    }

    // 4.2: Verificar componente Tooltip
    this.subsection('4.2 Componente Tooltip');
    const tooltipPath = path.join(process.cwd(), 'src/components/Tooltip.tsx');
    
    if (fs.existsSync(tooltipPath)) {
      this.pass('Componente Tooltip existe');
      
      const content = fs.readFileSync(tooltipPath, 'utf-8');
      
      if (content.includes('export function Tooltip')) {
        this.pass('Tooltip exportado correctamente');
      }

      if (content.includes('InformationCircleIcon')) {
        this.pass('Icono de información presente');
      }

      if (content.includes('onMouseEnter') && content.includes('onClick')) {
        this.pass('Soporte para desktop (hover) y móvil (click)');
      }
    } else {
      this.warn('Componente Tooltip NO existe', 'Sin ayuda contextual');
    }
  }

  // ============================================
  // 5. AUDITORÍA DE FRONTEND USUARIO
  // ============================================
  async auditFrontendUser() {
    this.section('5. AUDITORÍA DE FRONTEND USUARIO');

    // 5.1: Verificar componente PromoCodeInput
    this.subsection('5.1 Componente PromoCodeInput');
    const promoInputPath = path.join(process.cwd(), '..', '..', 'apps/web/components/PromoCodeInput.tsx');
    
    if (fs.existsSync(promoInputPath)) {
      this.pass('Componente PromoCodeInput existe');
      
      const content = fs.readFileSync(promoInputPath, 'utf-8');
      
      if (content.includes('onPromoApplied') && content.includes('onPromoRemoved')) {
        this.pass('Callbacks implementados');
      }

      if (content.includes('/api/promotions/validate')) {
        this.pass('Validación de código integrada');
      } else {
        this.fail('Validación de código faltante');
      }

      if (content.includes('loading') && content.includes('error')) {
        this.pass('Estados de loading y error implementados');
      }

      if (content.includes('appliedPromo')) {
        this.pass('Vista de código aplicado implementada');
      }
    } else {
      this.fail('Componente PromoCodeInput NO existe', 'Usuarios no pueden ingresar códigos');
    }

    // 5.2: Verificar integración en Wallet
    this.subsection('5.2 Integración en Wallet');
    const walletPath = path.join(process.cwd(), '..', '..', 'apps/web/app/dashboard/wallet/page.tsx');
    
    if (fs.existsSync(walletPath)) {
      const content = fs.readFileSync(walletPath, 'utf-8');
      
      if (content.includes('PromoCodeInput')) {
        this.pass('PromoCodeInput integrado en Wallet');
      } else {
        this.fail('PromoCodeInput NO integrado en Wallet');
      }

      if (content.includes('appliedPromo')) {
        this.pass('Estado de promoción aplicada presente');
      }

      if (content.includes('type="TOPUP"')) {
        this.pass('Tipo TOPUP configurado correctamente');
      }
    }

    // 5.3: Verificar integración en modales de pago
    this.subsection('5.3 Integración en Modales de Pago');
    
    const paymentModalPath = path.join(process.cwd(), '..', '..', 'apps/web/app/components/PaymentModal.tsx');
    if (fs.existsSync(paymentModalPath)) {
      const content = fs.readFileSync(paymentModalPath, 'utf-8');
      
      if (content.includes('PromoCodeInput')) {
        this.pass('PromoCodeInput integrado en PaymentModal');
      } else {
        this.fail('PromoCodeInput NO integrado en PaymentModal');
      }

      if (content.includes('type="RESERVATION"')) {
        this.pass('Tipo RESERVATION configurado correctamente');
      }
    }

    const mobilePaymentPath = path.join(process.cwd(), '..', '..', 'apps/web/app/components/MobilePaymentModal.tsx');
    if (fs.existsSync(mobilePaymentPath)) {
      const content = fs.readFileSync(mobilePaymentPath, 'utf-8');
      
      if (content.includes('PromoCodeInput')) {
        this.pass('PromoCodeInput integrado en MobilePaymentModal');
      } else {
        this.fail('PromoCodeInput NO integrado en MobilePaymentModal');
      }
    }

    // 5.4: Verificar páginas de usuario
    this.subsection('5.4 Páginas de Promociones');
    
    const promosPagePath = path.join(process.cwd(), '..', '..', 'apps/web/app/dashboard/promotions/page.tsx');
    if (fs.existsSync(promosPagePath)) {
      this.pass('Página /dashboard/promotions existe');
      
      const content = fs.readFileSync(promosPagePath, 'utf-8');
      
      if (content.includes('api.promotions.getActive')) {
        this.pass('  └─ Carga promociones activas');
      }

      if (content.includes('handleCopyCode') || content.includes('clipboard')) {
        this.pass('  └─ Funcionalidad copiar código');
      }
    } else {
      this.fail('Página de promociones NO existe', 'Usuarios no pueden ver promociones');
    }

    const historyPagePath = path.join(process.cwd(), '..', '..', 'apps/web/app/dashboard/promotions/history/page.tsx');
    if (fs.existsSync(historyPagePath)) {
      this.pass('Página /dashboard/promotions/history existe');
      
      const content = fs.readFileSync(historyPagePath, 'utf-8');
      
      if (content.includes('api.promotions.getMyHistory')) {
        this.pass('  └─ Carga historial de usuario');
      }

      if (content.includes('totalCreditsEarned')) {
        this.pass('  └─ Estadísticas implementadas');
      }
    } else {
      this.fail('Página de historial NO existe');
    }

    // 5.5: Verificar API client
    this.subsection('5.5 API Client');
    const apiClientPath = path.join(process.cwd(), '..', '..', 'apps/web/lib/api.ts');
    
    if (fs.existsSync(apiClientPath)) {
      const content = fs.readFileSync(apiClientPath, 'utf-8');
      
      if (content.includes('promotions:')) {
        this.pass('Sección promotions en API client');
        
        const methods = ['getActive', 'validate', 'apply', 'getMyHistory'];
        methods.forEach(method => {
          if (content.includes(`${method}:`)) {
            this.pass(`  └─ Método ${method} implementado`);
          } else {
            this.fail(`  └─ Método ${method} faltante`);
          }
        });
      } else {
        this.fail('Sección promotions faltante en API client');
      }
    }
  }

  // ============================================
  // 6. AUDITORÍA DE INTEGRACIÓN
  // ============================================
  async auditIntegration() {
    this.section('6. AUDITORÍA DE INTEGRACIÓN END-TO-END');

    // 6.1: Test de creación de promoción
    this.subsection('6.1 Test de Creación (Backend → DB)');
    try {
      const testPromo = await prisma.promotion.create({
        data: {
          name: 'AUDIT-TEST-PROMO',
          type: 'DISCOUNT_CODE',
          code: 'AUDITCODE',
          status: 'ACTIVE',
          conditions: { minAmount: 10 },
          rewards: { type: 'DISCOUNT_PERCENTAGE', value: 15 },
          validFrom: new Date(),
          usageCount: 0
        }
      });

      this.pass('Creación de promoción funciona');
      this.pass(`  └─ ID: ${testPromo.id}`);
      this.pass(`  └─ Tipo: ${testPromo.type}`);

      // Limpiar
      await prisma.promotion.delete({ where: { id: testPromo.id } });
      this.pass('  └─ Limpieza exitosa');
    } catch (error) {
      this.fail('Error creando promoción de prueba', error.message);
    }

    // 6.2: Verificar coherencia de tipos
    this.subsection('6.2 Coherencia de Tipos');
    
    // DB vs Backend
    const dbTypes = await prisma.$queryRaw`SELECT unnest(enum_range(NULL::"PromotionType"))::text as type`;
    const dbTypesList = dbTypes.map(t => t.type);

    const backendPath = path.join(process.cwd(), '..', '..', 'apps/api/src/app/api/admin/promotions/route.ts');
    if (fs.existsSync(backendPath)) {
      const content = fs.readFileSync(backendPath, 'utf-8');
      
      dbTypesList.forEach(type => {
        if (content.includes(`'${type}'`)) {
          this.pass(`Tipo ${type} coherente (DB ↔ Backend)`);
        } else {
          this.fail(`Tipo ${type} en DB pero NO en Backend`);
        }
      });
    }

    // Backend vs Frontend Admin
    const frontendAdminPath = path.join(process.cwd(), 'src/app/promotions/page.tsx');
    if (fs.existsSync(frontendAdminPath)) {
      const content = fs.readFileSync(frontendAdminPath, 'utf-8');
      
      dbTypesList.forEach(type => {
        if (content.includes(`value="${type}"`)) {
          this.pass(`Tipo ${type} coherente (DB ↔ Frontend Admin)`);
        } else {
          this.fail(`Tipo ${type} en DB pero NO en Frontend Admin`);
        }
      });
    }
  }

  // ============================================
  // 7. AUDITORÍA DE SEGURIDAD
  // ============================================
  async auditSecurity() {
    this.section('7. AUDITORÍA DE SEGURIDAD');

    this.subsection('7.1 Autenticación y Autorización');

    // Verificar middleware de admin
    const adminRoutePath = path.join(process.cwd(), '..', '..', 'apps/api/src/app/api/admin/promotions/route.ts');
    if (fs.existsSync(adminRoutePath)) {
      const content = fs.readFileSync(adminRoutePath, 'utf-8');
      
      if (content.includes('withAdminMiddleware')) {
        this.pass('Endpoints admin protegidos con middleware');
      } else {
        this.fail('Endpoints admin SIN protección', 'RIESGO DE SEGURIDAD CRÍTICO');
      }
    }

    // Verificar autenticación en endpoints de usuario
    const userEndpoints = ['validate', 'apply', 'my-history'];
    userEndpoints.forEach(endpoint => {
      const filePath = path.join(process.cwd(), '..', '..', `apps/api/src/app/api/promotions/${endpoint}/route.ts`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (content.includes('getAuthUser')) {
          this.pass(`Endpoint /${endpoint} requiere autenticación`);
        } else {
          if (endpoint === 'validate' || endpoint === 'apply' || endpoint === 'my-history') {
            this.fail(`Endpoint /${endpoint} sin autenticación`, 'RIESGO DE SEGURIDAD');
          }
        }
      }
    });

    this.subsection('7.2 Validación de Inputs');

    // Verificar esquemas Zod
    if (fs.existsSync(adminRoutePath)) {
      const content = fs.readFileSync(adminRoutePath, 'utf-8');
      
      if (content.includes('z.object({')) {
        this.pass('Schema de validación Zod presente');
      }

      if (content.includes('.parse(')) {
        this.pass('Validación de inputs con Zod implementada');
      }

      if (content.includes('z.ZodError')) {
        this.pass('Manejo de errores de validación');
      }
    }

    this.subsection('7.3 Idempotencia');

    // Verificar keys de idempotencia
    const serviceFiles = [
      'apps/api/src/lib/services/auth.service.ts',
      'apps/api/src/app/api/payments/webhook/redsys/route.ts',
      'apps/api/src/lib/services/reservation-payment.service.ts'
    ];

    serviceFiles.forEach(file => {
      const filePath = path.join(process.cwd(), '..', '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (content.includes('idempotencyKey')) {
          this.pass(`${path.basename(file)} usa idempotencyKey`);
        } else {
          this.warn(`${path.basename(file)} sin idempotencyKey`, 'Riesgo de duplicados');
        }
      }
    });
  }

  // ============================================
  // 8. AUDITORÍA DE PERFORMANCE
  // ============================================
  async auditPerformance() {
    this.section('8. AUDITORÍA DE PERFORMANCE');

    this.subsection('8.1 Transacciones Atómicas');

    const serviceFiles = [
      'apps/api/src/app/api/promotions/apply/route.ts',
      'apps/api/src/lib/services/auth.service.ts',
      'apps/api/src/app/api/payments/webhook/redsys/route.ts'
    ];

    serviceFiles.forEach(file => {
      const filePath = path.join(process.cwd(), '..', '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (content.includes('$transaction')) {
          this.pass(`${path.basename(file)} usa transacciones atómicas`);
        } else {
          this.warn(`${path.basename(file)} sin transacciones`, 'Riesgo de inconsistencias');
        }
      }
    });

    this.subsection('8.2 Índices de Base de Datos');
    
    const schemaPath = path.join(process.cwd(), '..', '..', 'packages/db/prisma/schema.prisma');
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      
      // Verificar índices en tabla Promotion
      if (content.includes('@@index([status, validFrom, validTo])')) {
        this.pass('Índice para búsqueda de promociones activas');
      } else {
        this.warn('Falta índice optimizado', 'Queries lentas en producción');
      }

      if (content.includes('@@index([code])')) {
        this.pass('Índice para búsqueda por código');
      }

      // Verificar índices en PromotionApplication
      if (content.includes('@@index([userId, appliedAt])')) {
        this.pass('Índice para historial de usuario');
      }

      if (content.includes('@@index([promotionId, appliedAt])')) {
        this.pass('Índice para aplicaciones por promoción');
      }
    }

    this.subsection('8.3 Logging y Debugging');
    
    const backendFiles = [
      'apps/api/src/app/api/admin/promotions/route.ts',
      'apps/api/src/app/api/promotions/apply/route.ts'
    ];

    backendFiles.forEach(file => {
      const filePath = path.join(process.cwd(), '..', '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        const logCount = (content.match(/console\.log/g) || []).length;
        const errorCount = (content.match(/console\.error/g) || []).length;

        if (logCount >= 5) {
          this.pass(`${path.basename(file)}: ${logCount} puntos de logging`);
        } else {
          this.warn(`${path.basename(file)}: Solo ${logCount} logs`, 'Dificulta debugging');
        }

        if (errorCount >= 2) {
          this.pass(`${path.basename(file)}: ${errorCount} puntos de error logging`);
        }
      }
    });
  }

  // ============================================
  // RESUMEN FINAL
  // ============================================
  async generateReport() {
    this.section('📊 REPORTE FINAL DE AUDITORÍA');

    const total = this.passed + this.failed + this.warnings;
    const passRate = ((this.passed / total) * 100).toFixed(1);

    this.log(`\n📈 ESTADÍSTICAS:\n`);
    this.log(`   ✅ Pasados:  ${this.passed}`, 'green');
    this.log(`   ❌ Fallidos: ${this.failed}`, this.failed > 0 ? 'red' : 'green');
    this.log(`   ⚠️  Warnings: ${this.warnings}`, this.warnings > 0 ? 'yellow' : 'green');
    this.log(`   📊 Total:    ${total}`);
    this.log(`   🎯 Tasa:     ${passRate}%\n`);

    // Calificación
    let grade = 'F';
    let status = '❌ CRÍTICO';
    let statusColor = 'red';

    if (this.failed === 0 && this.warnings === 0) {
      grade = 'A+';
      status = '🏆 EXCELENTE';
      statusColor = 'green';
    } else if (this.failed === 0 && this.warnings <= 5) {
      grade = 'A';
      status = '✅ MUY BUENO';
      statusColor = 'green';
    } else if (this.failed <= 2 && this.warnings <= 10) {
      grade = 'B';
      status = '✅ BUENO';
      statusColor = 'cyan';
    } else if (this.failed <= 5) {
      grade = 'C';
      status = '⚠️  ACEPTABLE';
      statusColor = 'yellow';
    } else {
      grade = 'F';
      status = '❌ CRÍTICO';
      statusColor = 'red';
    }

    this.log(`\n🎓 CALIFICACIÓN: ${grade}`, statusColor);
    this.log(`📋 ESTADO: ${status}\n`, statusColor);

    // Issues críticos
    if (this.issues.length > 0) {
      this.log('\n⚠️  ISSUES ENCONTRADOS:\n', 'yellow');
      
      const critical = this.issues.filter(i => i.severity === 'CRITICAL');
      const warnings = this.issues.filter(i => i.severity === 'WARNING');

      if (critical.length > 0) {
        this.log('🔴 CRÍTICOS:', 'red');
        critical.forEach((issue, index) => {
          this.log(`   ${index + 1}. ${issue.test}`, 'red');
          if (issue.details) this.log(`      ${issue.details}`, 'red');
        });
      }

      if (warnings.length > 0) {
        this.log('\n🟡 ADVERTENCIAS:', 'yellow');
        warnings.forEach((issue, index) => {
          this.log(`   ${index + 1}. ${issue.test}`, 'yellow');
          if (issue.details) this.log(`      ${issue.details}`, 'yellow');
        });
      }
    }

    this.log('\n' + '═'.repeat(70) + '\n', 'bright');

    return {
      passed: this.passed,
      failed: this.failed,
      warnings: this.warnings,
      total,
      passRate,
      grade,
      status,
      issues: this.issues
    };
  }

  // ============================================
  // EJECUTAR AUDITORÍA COMPLETA
  // ============================================
  async runFullAudit() {
    this.log('\n' + '═'.repeat(70), 'bright');
    this.log('  🔍 AUDITORÍA COMPLETA 360° - SISTEMA DE PROMOCIONES', 'bright');
    this.log('  Quality Assurance Exhaustivo', 'cyan');
    this.log('═'.repeat(70) + '\n', 'bright');

    try {
      await this.auditDatabase();
      await this.auditBackendAdmin();
      await this.auditBackendUser();
      await this.auditFrontendAdmin();
      await this.auditFrontendUser();
      await this.auditIntegration();
      await this.auditSecurity();
      await this.auditPerformance();

      const report = await this.generateReport();

      return report.failed === 0;
    } catch (error) {
      this.log(`\n❌ Error fatal en auditoría: ${error.message}`, 'red');
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Ejecutar auditoría
const audit = new PromotionSystemAudit();
audit.runFullAudit()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });

