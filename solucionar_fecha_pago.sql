-- Script para solucionar el problema de fecha_pago
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si la columna fecha_pago existe
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'proveedores' 
AND column_name = 'fecha_pago';

-- 2. Si la columna no existe, crearla
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

-- 3. Verificar y corregir las políticas RLS
-- Primero, eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Enable read access for all users" ON proveedores;
DROP POLICY IF EXISTS "Enable insert access for all users" ON proveedores;
DROP POLICY IF EXISTS "Enable update access for all users" ON proveedores;
DROP POLICY IF EXISTS "Enable delete access for all users" ON proveedores;

-- 4. Crear nuevas políticas RLS más permisivas
CREATE POLICY "Enable read access for all users" ON proveedores
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON proveedores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON proveedores
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON proveedores
    FOR DELETE USING (true);

-- 5. Verificar que RLS esté habilitado
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- 6. Verificar permisos de la tabla
GRANT ALL ON proveedores TO anon;
GRANT ALL ON proveedores TO authenticated;
GRANT ALL ON proveedores TO service_role;

-- 7. Verificar la secuencia de ID si existe
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 8. Probar la actualización directamente
UPDATE proveedores 
SET fecha_pago = CURRENT_DATE 
WHERE id = 2 
AND estado = 'Pagado';

-- 9. Verificar el resultado
SELECT id, nombre_proveedor, monto, estado, fecha_pago, updated_at 
FROM proveedores 
WHERE id = 2;

-- 10. Mostrar todas las políticas actuales
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'proveedores';

-- 11. Mostrar estructura final de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'proveedores'
ORDER BY ordinal_position; 