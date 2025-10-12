-- Migración Enterprise: Agregar soporte para franjas múltiples de horarios
-- Compatibilidad: Backward compatible - no rompe funcionalidad existente
-- Fecha: 2025-01-09
-- Descripción: Agregar campo schedule_slots para soportar múltiples franjas horarias por día
--              Mantener compatibilidad con operatingHours existente

-- Agregar columna para nueva estructura de horarios
ALTER TABLE "public"."centers" 
ADD COLUMN "schedule_slots" JSONB;

-- Crear índice para optimizar consultas de horarios
CREATE INDEX "centers_schedule_slots_idx" ON "public"."centers" USING GIN ("schedule_slots");

-- Comentario de documentación
COMMENT ON COLUMN "public"."centers"."schedule_slots" IS 'Estructura de horarios con franjas múltiples por día. Formato: { "monday": { "closed": false, "slots": [{ "start": "09:00", "end": "12:00" }, { "start": "15:00", "end": "18:00" }] } }';

-- Migrar datos existentes de operatingHours a schedule_slots
-- Solo para centros que tienen operatingHours configurado
UPDATE "public"."centers" 
SET "schedule_slots" = (
  SELECT jsonb_build_object(
    'monday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'monday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'monday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'monday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'monday'->>'open',
            'end', settings->'operatingHours'->'monday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    ),
    'tuesday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'tuesday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'tuesday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'tuesday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'tuesday'->>'open',
            'end', settings->'operatingHours'->'tuesday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    ),
    'wednesday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'wednesday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'wednesday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'wednesday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'wednesday'->>'open',
            'end', settings->'operatingHours'->'wednesday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    ),
    'thursday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'thursday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'thursday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'thursday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'thursday'->>'open',
            'end', settings->'operatingHours'->'thursday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    ),
    'friday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'friday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'friday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'friday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'friday'->>'open',
            'end', settings->'operatingHours'->'friday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    ),
    'saturday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'saturday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'saturday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'saturday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'saturday'->>'open',
            'end', settings->'operatingHours'->'saturday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    ),
    'sunday', jsonb_build_object(
      'closed', COALESCE((settings->'operatingHours'->'sunday'->>'closed')::boolean, false),
      'slots', CASE 
        WHEN settings->'operatingHours'->'sunday'->>'open' IS NOT NULL 
         AND settings->'operatingHours'->'sunday'->>'close' IS NOT NULL
        THEN jsonb_build_array(
          jsonb_build_object(
            'start', settings->'operatingHours'->'sunday'->>'open',
            'end', settings->'operatingHours'->'sunday'->>'close'
          )
        )
        ELSE jsonb_build_array()
      END
    )
  )
)
WHERE settings->'operatingHours' IS NOT NULL
  AND settings->'operatingHours' != 'null'::jsonb;

-- Verificar migración
DO $$
DECLARE
  migrated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM "public"."centers" WHERE "schedule_slots" IS NOT NULL;
  SELECT COUNT(*) INTO total_count FROM "public"."centers" WHERE settings->'operatingHours' IS NOT NULL;
  
  RAISE NOTICE 'Migración completada: % de % centros migrados', migrated_count, total_count;
  
  IF migrated_count != total_count THEN
    RAISE WARNING 'Algunos centros no fueron migrados correctamente';
  END IF;
END $$;



