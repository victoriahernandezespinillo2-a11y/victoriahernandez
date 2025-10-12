-- Migration: enhance_credit_system_v1
-- Fecha: 2025-01-21
-- Objetivo: Extender sistema de créditos manteniendo compatibilidad total
-- Reversible: SÍ

-- =====================================================
-- 1. EXTENDER TABLA DE RESERVAS PARA CRÉDITOS
-- =====================================================

-- Agregar campos de créditos a reservas (solo si no existen)
DO $$
BEGIN
    -- Verificar si las columnas ya existen antes de agregarlas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'credits_used') THEN
        ALTER TABLE reservations ADD COLUMN credits_used DECIMAL(15,4) DEFAULT 0;
        COMMENT ON COLUMN reservations.credits_used IS 'Créditos utilizados para esta reserva';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'credit_discount') THEN
        ALTER TABLE reservations ADD COLUMN credit_discount DECIMAL(15,4) DEFAULT 0;
        COMMENT ON COLUMN reservations.credit_discount IS 'Descuento aplicado por promociones de créditos';
    END IF;
END $$;

-- =====================================================
-- 2. CREAR TABLA DE PROMOCIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('SIGNUP_BONUS', 'RECHARGE_BONUS', 'USAGE_BONUS', 'SEASONAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
    conditions JSONB NOT NULL DEFAULT '{}',
    rewards JSONB NOT NULL DEFAULT '{}',
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentación
COMMENT ON TABLE promotions IS 'Promociones y bonificaciones de créditos';
COMMENT ON COLUMN promotions.type IS 'Tipo de promoción: SIGNUP_BONUS, RECHARGE_BONUS, USAGE_BONUS, SEASONAL';
COMMENT ON COLUMN promotions.conditions IS 'Condiciones para aplicar la promoción (minAmount, userGroups, etc.)';
COMMENT ON COLUMN promotions.rewards IS 'Recompensa de la promoción (type: FIXED_CREDITS o PERCENTAGE_BONUS, value)';

-- =====================================================
-- 3. CREAR TABLA DE APLICACIONES DE PROMOCIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS promotion_applications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits_awarded DECIMAL(15,4) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE promotion_applications IS 'Registro de aplicaciones de promociones a usuarios';
COMMENT ON COLUMN promotion_applications.credits_awarded IS 'Cantidad de créditos otorgados por esta aplicación';

-- =====================================================
-- 4. CREAR TABLA DE PAGOS UNIFICADA
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    method VARCHAR(20) NOT NULL CHECK (method IN ('CREDITS', 'CARD', 'MIXED')),
    credit_amount DECIMAL(15,4) DEFAULT 0,
    card_amount DECIMAL(15,4) DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    reference_type VARCHAR(30), -- 'RESERVATION', 'ORDER', 'TOPUP'
    reference_id TEXT,
    gateway_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Registro unificado de todos los pagos del sistema';
COMMENT ON COLUMN payments.method IS 'Método de pago: CREDITS, CARD, MIXED';
COMMENT ON COLUMN payments.reference_type IS 'Tipo de referencia: RESERVATION, ORDER, TOPUP';
COMMENT ON COLUMN payments.credit_amount IS 'Cantidad pagada con créditos (para pagos mixtos)';
COMMENT ON COLUMN payments.card_amount IS 'Cantidad pagada con tarjeta (para pagos mixtos)';

-- =====================================================
-- 5. CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para promociones
CREATE INDEX IF NOT EXISTS idx_promotions_status_valid 
    ON promotions(status, valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_promotions_code 
    ON promotions(code) WHERE code IS NOT NULL;

-- Índices para aplicaciones de promociones
CREATE INDEX IF NOT EXISTS idx_promotion_applications_user 
    ON promotion_applications(user_id, applied_at);

CREATE INDEX IF NOT EXISTS idx_promotion_applications_promotion 
    ON promotion_applications(promotion_id, applied_at);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_payments_user_status 
    ON payments(user_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_reference 
    ON payments(reference_type, reference_id) WHERE reference_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_method_status 
    ON payments(method, status);

CREATE INDEX IF NOT EXISTS idx_payments_created_at 
    ON payments(created_at);

-- Índices para reservas (nuevos campos)
CREATE INDEX IF NOT EXISTS idx_reservations_payment_method 
    ON reservations(payment_method) WHERE payment_method IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_credits_used 
    ON reservations(credits_used) WHERE credits_used > 0;

-- =====================================================
-- 6. CREAR TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CONSTRAINTS DE INTEGRIDAD
-- =====================================================

-- Validar que credit_amount + card_amount = amount en pagos mixtos
ALTER TABLE payments ADD CONSTRAINT chk_payment_amounts 
    CHECK (
        (method = 'CREDITS' AND credit_amount = amount AND card_amount = 0) OR
        (method = 'CARD' AND card_amount = amount AND credit_amount = 0) OR
        (method = 'MIXED' AND credit_amount + card_amount = amount)
    );

-- Validar que credits_awarded sea positivo
ALTER TABLE promotion_applications ADD CONSTRAINT chk_credits_awarded_positive 
    CHECK (credits_awarded > 0);

-- Validar que usage_count no exceda usage_limit
ALTER TABLE promotions ADD CONSTRAINT chk_usage_limit 
    CHECK (usage_limit IS NULL OR usage_count <= usage_limit);

-- =====================================================
-- 8. DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Insertar promoción de bienvenida por defecto
INSERT INTO promotions (id, name, type, conditions, rewards, valid_from, valid_to)
VALUES (
    'welcome-bonus-2025',
    'Bienvenida 2025',
    'SIGNUP_BONUS',
    '{"validForNewUsers": true}',
    '{"type": "FIXED_CREDITS", "value": 5}',
    NOW(),
    NOW() + INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las tablas se crearon correctamente
DO $$
BEGIN
    -- Verificar promociones
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
        RAISE EXCEPTION 'Error: Tabla promotions no se creó correctamente';
    END IF;
    
    -- Verificar aplicaciones de promociones
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_applications') THEN
        RAISE EXCEPTION 'Error: Tabla promotion_applications no se creó correctamente';
    END IF;
    
    -- Verificar pagos
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE EXCEPTION 'Error: Tabla payments no se creó correctamente';
    END IF;
    
    RAISE NOTICE '✅ Migración enhance_credit_system_v1 completada exitosamente';
END $$;


