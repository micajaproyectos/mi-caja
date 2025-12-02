-- Script para agregar columnas de entrega a la tabla transporte
-- Estas columnas registran información de la entrega real:
-- - fecha_hora_entrega: fecha y hora exacta (Santiago, Chile) en que se entregó
-- - nombre_retiro: nombre de quien REALMENTE retiró la carga al momento de entregarla
-- Ambas se llenan cuando el estado cambia a 'entregado'

-- 1. Agregar la columna fecha_hora_entrega (permite NULL)
ALTER TABLE public.transporte 
ADD COLUMN IF NOT EXISTS fecha_hora_entrega TIMESTAMP WITH TIME ZONE NULL;

-- 2. Agregar la columna nombre_retiro (permite NULL)
ALTER TABLE public.transporte 
ADD COLUMN IF NOT EXISTS nombre_retiro TEXT NULL;

-- 3. Crear índice para mejorar búsquedas por fecha de entrega
CREATE INDEX IF NOT EXISTS idx_transporte_fecha_hora_entrega 
ON public.transporte(fecha_hora_entrega);

-- 4. Agregar comentarios para documentación
COMMENT ON COLUMN public.transporte.fecha_hora_entrega IS 
'Fecha y hora real de entrega (se registra cuando el estado cambia a entregado) - Zona horaria: America/Santiago';

COMMENT ON COLUMN public.transporte.nombre_retiro IS 
'Nombre de quien REALMENTE retiró la carga al momento de la entrega (se captura mediante popup al cambiar a entregado)';

-- 5. Verificar que las columnas se agregaron correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transporte' 
AND column_name IN ('fecha_hora_entrega', 'nombre_retiro')
AND table_schema = 'public'
ORDER BY column_name;

-- 6. Ver estructura completa actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transporte' 
AND table_schema = 'public'
ORDER BY ordinal_position;

