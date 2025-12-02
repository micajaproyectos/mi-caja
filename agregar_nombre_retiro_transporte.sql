-- Script para agregar columna nombre_retiro a la tabla transporte
-- Esta columna registra el nombre de quien REALMENTE retira la carga al momento de entregarla
-- Se llena mediante un popup cuando el estado cambia a 'entregado'

-- 1. Agregar la columna nombre_retiro (permite NULL)
ALTER TABLE public.transporte 
ADD COLUMN IF NOT EXISTS nombre_retiro TEXT NULL;

-- 2. Agregar comentario para documentación
COMMENT ON COLUMN public.transporte.nombre_retiro IS 
'Nombre de quien REALMENTE retira la carga al momento de la entrega (se registra vía popup cuando cambia a entregado)';

-- 3. Verificar que la columna se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transporte' 
AND column_name = 'nombre_retiro'
AND table_schema = 'public';

-- 4. Ver estructura completa actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transporte' 
AND table_schema = 'public'
ORDER BY ordinal_position;


