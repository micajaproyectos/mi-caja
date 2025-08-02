-- Script para verificar la configuración de la columna fecha_pago
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar que la columna fecha_pago existe
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'proveedores' 
AND column_name = 'fecha_pago';

-- 2. Verificar la estructura completa de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'proveedores'
ORDER BY ordinal_position;

-- 3. Verificar permisos de la tabla
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'proveedores';

-- 4. Verificar políticas RLS
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'proveedores';

-- 5. Probar inserción de datos con fecha_pago
INSERT INTO proveedores (nombre_proveedor, monto, estado, fecha_pago) 
VALUES ('Test Proveedor', 100000, 'Pagado', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- 6. Verificar que se insertó correctamente
SELECT id, nombre_proveedor, monto, estado, fecha_pago, created_at 
FROM proveedores 
WHERE nombre_proveedor = 'Test Proveedor';

-- 7. Probar actualización de fecha_pago
UPDATE proveedores 
SET fecha_pago = CURRENT_DATE 
WHERE nombre_proveedor = 'Test Proveedor' 
AND estado = 'Pagado';

-- 8. Verificar la actualización
SELECT id, nombre_proveedor, monto, estado, fecha_pago, updated_at 
FROM proveedores 
WHERE nombre_proveedor = 'Test Proveedor';

-- 9. Limpiar datos de prueba
DELETE FROM proveedores WHERE nombre_proveedor = 'Test Proveedor'; 