-- ============================================================================
-- VERIFICAR ESTRUCTURA DE LA TABLA GASTO
-- ============================================================================
-- Este script nos ayudará a entender la estructura exacta de la tabla gasto

-- 1. Verificar si la tabla existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla gasto existe'
        ELSE '❌ Tabla gasto NO existe'
    END as tabla_existe
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'gasto';

-- 2. Ver estructura de columnas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gasto'
ORDER BY ordinal_position;

-- 3. Ver algunos registros de ejemplo (solo los primeros 3)
SELECT * FROM public.gasto LIMIT 3;

-- 4. Verificar si tiene campo cliente_id
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Campo cliente_id existe'
        ELSE '❌ Campo cliente_id NO existe'
    END as tiene_cliente_id
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gasto'
AND column_name = 'cliente_id';

-- 5. Verificar el tipo de campo id
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gasto'
AND column_name = 'id';

-- 6. Verificar si tiene usuario_id
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Campo usuario_id existe'
        ELSE '❌ Campo usuario_id NO existe'
    END as tiene_usuario_id
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gasto'
AND column_name = 'usuario_id';
