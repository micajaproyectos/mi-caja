-- =====================================================
-- PASO 3: VERIFICACIÓN SIMPLE (SOLO LECTURA)
-- =====================================================

-- 3.1 Contar cuántos usuarios hay en la tabla usuarios
SELECT COUNT(*) as total_usuarios
FROM public.usuarios;

-- 3.2 Verificar si el usuario con ID a8449c95-eb79-4f59-94b3-a12c47cd1a44 existe
-- (Este es el usuario_id que apareció en el error 406 de tu log)
SELECT 
    usuario_id,
    nombre,
    email,
    rol,
    cliente_id
FROM public.usuarios
WHERE usuario_id = 'a8449c95-eb79-4f59-94b3-a12c47cd1a44';

-- Si esta consulta devuelve "Success. No rows returned" es porque
-- el SQL Editor no tiene contexto de auth. Eso es NORMAL.

-- 3.3 Ver usuarios en Supabase Auth (si tienes permisos)
SELECT 
    id,
    email,
    email_confirmed_at
FROM auth.users
WHERE email = 'rios.godoy.macarena@gmail.com'
LIMIT 1;

-- Si falla con "permission denied", está bien. Pasa al siguiente paso.

