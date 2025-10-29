-- =====================================================
-- PASO 3: VERIFICAR USUARIOS EN SUPABASE AUTH
-- =====================================================

-- 3.1 Ver todos los usuarios registrados en Supabase Auth
-- Esta consulta accede a la tabla auth.users (requiere permisos de admin)
SELECT 
    id as auth_user_id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Si esta consulta falla con "permission denied", 
-- entonces necesitamos usar otra aproximación


-- 3.2 Ver todos los usuarios en la tabla usuarios (SIN filtro RLS)
-- Para esto, necesitamos DESACTIVAR RLS temporalmente
-- IMPORTANTE: Esto es solo para diagnóstico, NO lo dejamos así

-- Primero, ver cuántos usuarios hay en la tabla
SELECT COUNT(*) as total_usuarios
FROM public.usuarios;


-- 3.3 Ver algunos usuarios de ejemplo (deshabilitando RLS temporalmente)
-- SOLO PARA DIAGNÓSTICO - Ejecutar estas 3 líneas juntas:

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

SELECT 
    usuario_id,
    nombre,
    email,
    rol,
    cliente_id,
    created_at
FROM public.usuarios
ORDER BY created_at DESC
LIMIT 5;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: La tercera línea VUELVE A ACTIVAR RLS inmediatamente

