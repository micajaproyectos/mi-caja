-- ============================================
-- Migración: agregar columna 'fuente' a caja_diaria
-- Permite registros independientes por componente (registroventa / pedidos)
-- ============================================

-- 1. Agregar columna fuente con default 'registroventa'
--    Las filas existentes quedan con fuente = 'registroventa' automáticamente.
ALTER TABLE public.caja_diaria
  ADD COLUMN IF NOT EXISTS fuente TEXT NOT NULL DEFAULT 'registroventa';

-- 2. Eliminar la restricción UNIQUE anterior (usuario_id, fecha)
ALTER TABLE public.caja_diaria
  DROP CONSTRAINT IF EXISTS uq_caja_diaria_usuario_fecha;

-- 3. Nueva restricción: un registro por usuario + fecha + fuente
ALTER TABLE public.caja_diaria
  ADD CONSTRAINT uq_caja_diaria_usuario_fecha_fuente
  UNIQUE (usuario_id, fecha, fuente);

-- 4. Comentario en la columna
COMMENT ON COLUMN public.caja_diaria.fuente IS 'Componente que generó el registro: registroventa o pedidos';

-- 5. Verificar resultado
SELECT
    column_name  AS columna,
    data_type    AS tipo,
    is_nullable  AS nullable,
    column_default AS default
FROM information_schema.columns
WHERE table_name   = 'caja_diaria'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar la nueva restricción
SELECT
    conname        AS restriccion,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.caja_diaria'::regclass
  AND contype  = 'u';
