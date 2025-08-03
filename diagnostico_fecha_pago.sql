-- Script de diagnóstico para el problema de fecha_pago
-- Ejecutar este script en el SQL Editor de Supabase para identificar el problema específico

-- 1. Información general de la tabla
SELECT 
    '=== INFORMACIÓN GENERAL DE LA TABLA ===' as seccion;

SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'proveedores';

-- 2. Estructura completa de la tabla
SELECT 
    '=== ESTRUCTURA DE LA TABLA ===' as seccion;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'proveedores'
ORDER BY ordinal_position;

-- 3. Verificar si RLS está habilitado
SELECT 
    '=== CONFIGURACIÓN RLS ===' as seccion;

SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'proveedores';

-- 4. Políticas RLS actuales
SELECT 
    '=== POLÍTICAS RLS ACTUALES ===' as seccion;

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'proveedores';

-- 5. Permisos de la tabla
SELECT 
    '=== PERMISOS DE LA TABLA ===' as seccion;

SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'proveedores'
ORDER BY grantee, privilege_type;

-- 6. Permisos en secuencias
SELECT 
    '=== PERMISOS EN SECUENCIAS ===' as seccion;

SELECT 
    sequence_name,
    grantee,
    privilege_type
FROM information_schema.usage_privileges 
WHERE object_name LIKE '%proveedores%';

-- 7. Datos actuales (primeros 5 registros)
SELECT 
    '=== DATOS ACTUALES ===' as seccion;

SELECT 
    id,
    fecha,
    nombre_proveedor,
    monto,
    estado,
    fecha_pago,
    created_at,
    updated_at
FROM proveedores 
ORDER BY id 
LIMIT 5;

-- 8. Verificar restricciones
SELECT 
    '=== RESTRICCIONES DE LA TABLA ===' as seccion;

SELECT 
    constraint_name,
    constraint_type,
    table_name,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'proveedores';

-- 9. Verificar triggers
SELECT 
    '=== TRIGGERS ===' as seccion;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'proveedores';

-- 10. Prueba de actualización simple
SELECT 
    '=== PRUEBA DE ACTUALIZACIÓN ===' as seccion;

-- Intentar actualización simple
UPDATE proveedores 
SET estado = 'Pagado' 
WHERE id = 1 
AND estado = 'Pendiente';

-- Verificar resultado
SELECT 
    'Registro después de actualización simple:' as info,
    id,
    nombre_proveedor,
    estado,
    fecha_pago
FROM proveedores 
WHERE id = 1;

-- 11. Prueba de actualización con fecha_pago
UPDATE proveedores 
SET fecha_pago = CURRENT_DATE 
WHERE id = 1 
AND estado = 'Pagado';

-- Verificar resultado final
SELECT 
    'Registro después de actualización con fecha_pago:' as info,
    id,
    nombre_proveedor,
    estado,
    fecha_pago,
    updated_at
FROM proveedores 
WHERE id = 1;

-- 12. Resumen de diagnóstico
SELECT 
    '=== RESUMEN DE DIAGNÓSTICO ===' as seccion;

SELECT 
    'Si ves errores en las secciones anteriores, esos son los problemas.' as mensaje,
    'Si no hay errores pero fecha_pago sigue sin actualizarse, el problema puede estar en:' as posible_causa,
    '1. Configuración de Supabase' as causa1,
    '2. Políticas RLS muy restrictivas' as causa2,
    '3. Problemas de permisos específicos' as causa3,
    '4. Configuración de autenticación' as causa4; 