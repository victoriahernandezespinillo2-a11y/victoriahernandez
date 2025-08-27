# 🔧 Solución Error SIS0042 Redsys

## ❌ Problema Identificado:
- **Error SIS0042**: "Error en datos enviados"
- **Causa**: Usando merchant code REAL (367717568) con clave GENÉRICA de test
- **Resultado**: Firma digital inválida

## ✅ Solución Inmediata:

### Opción 1: Testing con datos 100% genéricos

Cambiar en `.env`:
```bash
# De:
REDSYS_MERCHANT_CODE=367717568

# A:
REDSYS_MERCHANT_CODE=999008881
```

### Opción 2: Obtener tu clave real de test

Contactar al banco para obtener tu clave específica de testing para el merchant 367717568.

## 🚀 Comando para aplicar Opción 1:

```powershell
(Get-Content .env) -replace 'REDSYS_MERCHANT_CODE=367717568', 'REDSYS_MERCHANT_CODE=999008881' | Set-Content .env
```

Luego reiniciar los servidores:
```bash
# Reiniciar API
cd apps/api && npm run dev

# Reiniciar Web  
cd apps/web && npm run dev
```

## 📋 Verificación:

Después del cambio, en los logs deberías ver:
- ✅ No más warnings sobre "clave genérica con merchant específico"
- ✅ merchantType: 'GENERIC' (en lugar de 'SPECIFIC')
- ✅ El pago debería proceder sin error SIS0042

