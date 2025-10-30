-- =====================================================
-- CORREGIR TABLA MESAS_CONFIG
-- =====================================================
-- Eliminar el foreign key problemático a la tabla clientes

-- 1. Primero, eliminar el constraint que causa el error
ALTER TABLE public.mesas_config
DROP CONSTRAINT IF EXISTS mesas_config_cliente_id_fkey;

-- 2. Hacer que cliente_id sea nullable (opcional)
ALTER TABLE public.mesas_config
ALTER COLUMN cliente_id DROP NOT NULL;

-- 3. Verificar que se eliminó correctamente
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conrelid = 'public.mesas_config'::regclass
  AND contype = 'f'; -- foreign keys

-- Debería mostrar solo el constraint a auth.users, NO a clientes

-- 4. Verificar la estructura actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mesas_config'
ORDER BY ordinal_position;

-- 5. Limpiar registros existentes que puedan estar causando problemas
-- SOLO ejecutar si quieres empezar de cero con las mesas
-- DELETE FROM public.mesas_config;

