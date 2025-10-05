-- Script para explorar la estructura de usuarios y roles en Supabase
-- Ejecuta este script en el SQL Editor de Supabase para entender la estructura

-- 1. Verificar si existe la tabla 'usuarios' y su estructura
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si existe la tabla 'roles' y su estructura
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Ver todas las tablas que contengan 'usuario' o 'role' en el nombre
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE (table_name ILIKE '%usuario%' OR table_name ILIKE '%role%')
AND table_schema IN ('public', 'auth')
ORDER BY table_schema, table_name;

-- 4. Ver la estructura de auth.users (tabla de usuarios de Supabase)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 5. Ver si hay metadatos de roles en auth.users
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
AND column_name ILIKE '%role%'
ORDER BY ordinal_position;

-- 6. Ver políticas existentes en otras tablas para entender el patrón
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('ventas', 'inventario', 'gastos', 'pedidos')
ORDER BY tablename, policyname;

-- 7. Verificar si hay funciones para obtener roles de usuario
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name ILIKE '%role%' OR routine_name ILIKE '%admin%' OR routine_name ILIKE '%user%')
ORDER BY routine_name;
