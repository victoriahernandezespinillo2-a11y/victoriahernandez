# 🧪 Tests del Sistema de Promociones

Esta carpeta contiene scripts de prueba completos para verificar el funcionamiento de todos los tipos de promociones del sistema.

## 📋 Tests Disponibles

### 1. **SIGNUP_BONUS** (Bono de Registro) 🎁
**Archivo:** `test-signup-bonus.cjs`

Prueba el flujo de bono de bienvenida para nuevos usuarios.

**Qué prueba:**
- Creación de promoción SIGNUP_BONUS
- Registro de nuevo usuario
- Aplicación automática del bono
- Verificación de créditos iniciales

**Ejecutar:**
```bash
node tests/test-signup-bonus.cjs
```

---

### 2. **RECHARGE_BONUS** (Bono de Recarga) 💰
**Archivo:** `test-recharge-bonus.cjs`

Prueba el sistema de bonificación por recarga de créditos.

**Qué prueba:**
- Creación de promoción RECHARGE_BONUS con porcentaje
- Simulación de recarga de créditos
- Aplicación automática de bonus porcentual
- Verificación de límites máximos

**Ejecutar:**
```bash
node tests/test-recharge-bonus.cjs
```

---

### 3. **USAGE_BONUS** (Cashback) 🎮
**Archivo:** `test-usage-bonus.cjs`

Prueba el sistema de cashback por uso de servicios.

**Qué prueba:**
- Creación de promoción USAGE_BONUS
- Simulación de reserva pagada con créditos
- Aplicación automática de cashback
- Verificación de retorno de créditos

**Ejecutar:**
```bash
node tests/test-usage-bonus.cjs
```

---

### 4. **REFERRAL_BONUS** (Sistema de Referidos) 🔗
**Archivo:** `test-referral-complete.cjs`

Prueba el sistema completo de referidos.

**Qué prueba:**
- Creación de promoción REFERRAL_BONUS
- Generación de códigos únicos de referido
- Registro de usuario referido
- Aplicación automática de bonus al referidor
- Verificación de relaciones y estadísticas

**Ejecutar:**
```bash
node tests/test-referral-complete.cjs
```

---

### 5. **DISCOUNT_CODE** (Código de Descuento) 🎫
**Archivo:** `test-discount-code.cjs`

Prueba el sistema de códigos promocionales.

**Qué prueba:**
- Creación de promoción DISCOUNT_CODE con código único
- Validación del código
- Aplicación de descuento en compra
- Verificación de uso único por usuario

**Ejecutar:**
```bash
node tests/test-discount-code.cjs
```

---

## 🚀 Ejecutar Todos los Tests

Para ejecutar todos los tests en secuencia:

```bash
node tests/run-all-tests.cjs
```

Este comando ejecutará automáticamente todos los tests y mostrará un resumen final.

---

## 🧹 Limpiar Datos de Prueba

Cada test puede limpiar sus propios datos:

```bash
# Limpiar test individual
node tests/test-signup-bonus.cjs --cleanup
node tests/test-recharge-bonus.cjs --cleanup
node tests/test-usage-bonus.cjs --cleanup
node tests/test-referral-complete.cjs --cleanup
node tests/test-discount-code.cjs --cleanup

# Limpiar todos los tests
node tests/run-all-tests.cjs --cleanup
```

---

## 📊 Estructura de un Test

Cada test sigue esta estructura:

1. **Crear Promoción** - Se crea la promoción del tipo correspondiente
2. **Crear Usuario(s)** - Se crean usuarios de prueba con emails únicos
3. **Simular Acción** - Se simula la acción que dispara la promoción
4. **Aplicar Bonus** - Se aplica el bonus automáticamente
5. **Verificar Resultados** - Se verifica que todo funcionó correctamente
6. **Mostrar Resumen** - Se muestra un resumen detallado de la prueba

---

## 🔍 Detalles de Implementación

### Emails de Prueba
Todos los usuarios de prueba tienen emails con el formato:
```
{tipo}_{timestamp}_{random}@test.com
```

Ejemplo: `referidor_1760286188940_cch90r@test.com`

### Limpieza de Datos
La limpieza elimina:
- ✅ Usuarios con email `@test.com`
- ✅ Promociones con nombre que contiene "Test"
- ✅ Aplicaciones de promociones de prueba
- ✅ Registros de wallet ledger asociados

### Transacciones Atómicas
Todos los tests usan transacciones de Prisma (`$transaction`) para garantizar:
- ✅ Consistencia de datos
- ✅ Rollback automático en caso de error
- ✅ Integridad referencial

---

## ✅ Verificaciones Realizadas

Cada test verifica:

| Aspecto | Verificación |
|---------|--------------|
| **Promoción** | Creada correctamente con configuración válida |
| **Usuario(s)** | Creados con balance inicial correcto |
| **Aplicación** | Bonus aplicado automáticamente |
| **Balance** | Créditos actualizados correctamente |
| **Wallet Ledger** | Transacción registrada |
| **Promotion Application** | Aplicación registrada con metadata |
| **Contadores** | `usageCount` incrementado |

---

## 🎯 Casos de Uso

### Desarrollo
```bash
# Probar una funcionalidad específica
node tests/test-referral-complete.cjs

# Verificar que todo funciona
node tests/run-all-tests.cjs
```

### Testing
```bash
# Suite completa de tests
node tests/run-all-tests.cjs

# Verificar limpieza
node tests/run-all-tests.cjs --cleanup
```

### Debugging
```bash
# Ejecutar test individual y revisar output
node tests/test-usage-bonus.cjs

# Limpiar y volver a ejecutar
node tests/test-usage-bonus.cjs --cleanup
node tests/test-usage-bonus.cjs
```

---

## 🏆 Resultados Esperados

Al ejecutar todos los tests, deberías ver:

```
🚀 INICIANDO SUITE COMPLETA DE TESTS DE PROMOCIONES
════════════════════════════════════════════════════════════════
🧪 MODO PRUEBA: Ejecutando todos los tests
════════════════════════════════════════════════════════════════

🎁 SIGNUP_BONUS (BONO DE REGISTRO)
✅ SIGNUP_BONUS (Bono de Registro) - COMPLETADO

💰 RECHARGE_BONUS (BONO DE RECARGA)
✅ RECHARGE_BONUS (Bono de Recarga) - COMPLETADO

🎮 USAGE_BONUS (CASHBACK)
✅ USAGE_BONUS (Cashback) - COMPLETADO

🔗 REFERRAL_BONUS (SISTEMA DE REFERIDOS)
✅ REFERRAL_BONUS (Sistema de Referidos) - COMPLETADO

🎫 DISCOUNT_CODE (CÓDIGO DE DESCUENTO)
✅ DISCOUNT_CODE (Código de Descuento) - COMPLETADO

════════════════════════════════════════════════════════════════
📊 RESUMEN FINAL
════════════════════════════════════════════════════════════════

🎉 Tests ejecutados:
   ✅ Exitosos: 5/5

🏆 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!
   El sistema de promociones está funcionando perfectamente.
```

---

## 📝 Notas

- Los tests son **idempotentes**: pueden ejecutarse múltiples veces
- Los datos de prueba son **únicos**: cada ejecución genera datos nuevos
- La limpieza es **segura**: solo elimina datos marcados como prueba
- Los tests son **independientes**: pueden ejecutarse en cualquier orden

---

## 🆘 Solución de Problemas

### Error: "Cannot find module '@prisma/client'"
```bash
cd packages/db
npm install
```

### Error: "P1001: Can't reach database server"
Verifica tu conexión a la base de datos en `.env`

### Los tests pasan pero no veo datos
Es normal, los tests crean y limpian datos automáticamente. Para ver datos persistentes, ejecuta los tests sin `--cleanup`.

---

## 🤝 Contribuir

Para agregar un nuevo test:

1. Crea un archivo `test-{tipo}.cjs`
2. Sigue la estructura de los tests existentes
3. Agrega el test a `run-all-tests.cjs`
4. Documenta en este README

---

## 📚 Referencias

- [Documentación de Prisma](https://www.prisma.io/docs/)
- [Guía de Transacciones](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Sistema de Promociones](../../apps/api/src/app/api/admin/promotions/route.ts)

---

**¡Happy Testing!** 🚀

