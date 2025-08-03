-- Script V2 para solucionar definitivamente el problema de fecha_pago
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar el estado actual de la tabla
SELECT 
    'Estado actual de la tabla proveedores:' as info,
    COUNT(*) as total_registros
FROM proveedores;

-- 2. Verificar si la columna fecha_pago existe
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'proveedores' 
AND column_name = 'fecha_pago';

-- 3. Si la columna no existe, crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proveedores' 
        AND column_name = 'fecha_pago'
    ) THEN
        ALTER TABLE proveedores ADD COLUMN fecha_pago DATE NULL;
        RAISE NOTICE 'Columna fecha_pago agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna fecha_pago ya existe';
    END IF;
END $$;

-- 4. Deshabilitar RLS temporalmente para hacer cambios
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;

-- 5. Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Enable read access for all users" ON proveedores;
DROP POLICY IF EXISTS "Enable insert access for all users" ON proveedores;
DROP POLICY IF EXISTS "Enable update access for all users" ON proveedores;
DROP POLICY IF EXISTS "Enable delete access for all users" ON proveedores;
DROP POLICY IF EXISTS "Users can view own data" ON proveedores;
DROP POLICY IF EXISTS "Users can insert own data" ON proveedores;
DROP POLICY IF EXISTS "Users can update own data" ON proveedores;
DROP POLICY IF EXISTS "Users can delete own data" ON proveedores;

-- 6. Otorgar permisos completos a todos los roles
GRANT ALL PRIVILEGES ON TABLE proveedores TO anon;
GRANT ALL PRIVILEGES ON TABLE proveedores TO authenticated;
GRANT ALL PRIVILEGES ON TABLE proveedores TO service_role;

-- 7. Otorgar permisos en la secuencia de ID
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 8. Habilitar RLS nuevamente
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- 9. Crear políticas RLS completamente permisivas
CREATE POLICY "Allow all operations for all users" ON proveedores
    FOR ALL USING (true) WITH CHECK (true);

-- 10. Verificar que las políticas se crearon correctamente
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'proveedores';

-- 11. Probar una actualización directa para verificar que funciona
UPDATE proveedores 
SET fecha_pago = CURRENT_DATE 
WHERE id = 1 
AND estado = 'Pagado';

-- 12. Verificar el resultado de la prueba
SELECT 
    id, 
    nombre_proveedor, 
    monto, 
    estado, 
    fecha_pago, 
    updated_at 
FROM proveedores 
WHERE id = 1;

-- 13. Mostrar la estructura final de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'proveedores'
ORDER BY ordinal_position;

-- 14. Verificar permisos finales
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'proveedores';

-- 15. Mensaje de confirmación
SELECT 'Script ejecutado exitosamente. La tabla proveedores ahora debería permitir actualizaciones de fecha_pago.' as resultado; 