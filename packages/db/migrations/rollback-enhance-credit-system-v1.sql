-- Rollback Migration: enhance_credit_system_v1
-- Fecha: 2025-01-21
-- Objetivo: Revertir cambios de enhance_credit_system_v1
-- ATENCIÓN: Esta operación eliminará datos de promociones y pagos

-- =====================================================
-- 1. ELIMINAR TABLAS CREADAS
-- =====================================================

-- Eliminar tabla de aplicaciones de promociones (primero por FK)
DROP TABLE IF EXISTS promotion_applications CASCADE;

-- Eliminar tabla de promociones
DROP TABLE IF EXISTS promotions CASCADE;

-- Eliminar tabla de pagos
DROP TABLE IF EXISTS payments CASCADE;

-- =====================================================
-- 2. ELIMINAR COLUMNAS AGREGADAS A RESERVAS
-- =====================================================

-- Eliminar columnas de créditos de reservas
ALTER TABLE reservations DROP COLUMN IF EXISTS credits_used;
ALTER TABLE reservations DROP COLUMN IF EXISTS credit_discount;

-- =====================================================
-- 3. ELIMINAR ÍNDICES
-- =====================================================

-- Eliminar índices de reservas
DROP INDEX IF EXISTS idx_reservations_payment_method;
DROP INDEX IF EXISTS idx_reservations_credits_used;

-- =====================================================
-- 4. ELIMINAR FUNCIONES Y TRIGGERS
-- =====================================================

-- Eliminar trigger
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;

-- La función update_updated_at_column() se mantiene porque puede estar en uso por otras tablas

-- =====================================================
-- VERIFICACIÓN DE ROLLBACK
-- =====================================================

DO $$
BEGIN
    -- Verificar que las tablas se eliminaron
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
        RAISE EXCEPTION 'Error: Tabla promotions aún existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_applications') THEN
        RAISE EXCEPTION 'Error: Tabla promotion_applications aún existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE EXCEPTION 'Error: Tabla payments aún existe';
    END IF;
    
    -- Verificar que las columnas se eliminaron
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'reservations' AND column_name = 'credits_used') THEN
        RAISE EXCEPTION 'Error: Columna credits_used aún existe en reservations';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'reservations' AND column_name = 'credit_discount') THEN
        RAISE EXCEPTION 'Error: Columna credit_discount aún existe en reservations';
    END IF;
    
    RAISE NOTICE '✅ Rollback de enhance_credit_system_v1 completado exitosamente';
END $$;




