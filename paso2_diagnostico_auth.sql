-- =====================================================
-- PASO 2: DIAGNÓSTICO DE AUTENTICACIÓN (SOLO LECTURA)
-- =====================================================

-- 2.1 Ver el estado de RLS en la tabla usuarios
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'usuarios';

-- Resultado esperado: rls_habilitado = true o false


-- 2.2 Ver el UUID del usuario actual de Supabase Auth
SELECT auth.uid() as auth_user_id;

-- Este es el UUID que devuelve Supabase Auth para el usuario logueado
-- Debería verse algo como: a8449c95-eb79-4f59-94b3-a12c47cd1a44


-- 2.3 Verificar si existe un registro en usuarios con ese auth.uid()
SELECT 
    usuario_id,
    nombre,
    email,
    rol,
    cliente_id
FROM public.usuarios
WHERE usuario_id = auth.uid();

-- Si esta consulta NO devuelve ningún resultado, entonces ESE es el problema
-- Si devuelve resultados, entonces las políticas RLS están funcionando correctamente


-- 2.4 Ver todos los usuarios (solo si la consulta anterior falló)
-- IMPORTANTE: Solo ejecutar esto si la consulta 2.3 no devolvió resultados
-- SELECT 
--     usuario_id,
--     nombre,
--     email
-- FROM public.usuarios
-- LIMIT 5;

