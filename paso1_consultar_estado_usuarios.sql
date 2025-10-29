-- =====================================================
-- PASO 1: CONSULTAR ESTADO ACTUAL (SOLO LECTURA)
-- =====================================================
-- Esta consulta NO hace cambios, solo muestra información

-- 1.1 Verificar si RLS está habilitado en la tabla usuarios
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'usuarios';

-- Resultado esperado:
-- rls_habilitado = true (si está habilitado)
-- rls_habilitado = false (si está deshabilitado)


-- 1.2 Ver TODAS las políticas actuales de la tabla usuarios
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY cmd, policyname;

-- Esto mostrará todas las políticas existentes
-- Anota los resultados para analizarlos juntos


-- 1.3 Ver la estructura de la tabla usuarios
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- Esto muestra las columnas de la tabla usuarios

