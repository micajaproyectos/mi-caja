-- =====================================================
-- VERIFICAR TABLA CLIENTES
-- =====================================================

-- 1. Verificar si la tabla clientes existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clientes'
) as tabla_clientes_existe;

-- 2. Si existe, ver su estructura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clientes'
ORDER BY ordinal_position;

-- 3. Ver datos de ejemplo en clientes
SELECT * FROM public.clientes LIMIT 5;

-- 4. Verificar qué cliente_id tiene el usuario actual en la tabla usuarios
SELECT 
    usuario_id,
    nombre,
    cliente_id
FROM public.usuarios
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

-- 5. Verificar si ese cliente_id existe en la tabla clientes
SELECT * FROM public.clientes 
WHERE id = 'e4184187-dd66-4fec-ba30-c6a34750480e';

