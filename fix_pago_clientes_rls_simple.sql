-- Solución simple para corregir políticas RLS de pago_clientes
-- Ejecutar en Supabase SQL Editor

-- Opción 1: Deshabilitar RLS temporalmente (solo para pruebas)
-- ALTER TABLE pago_clientes DISABLE ROW LEVEL SECURITY;

-- Opción 2: Crear política simple de inserción (RECOMENDADA)
-- Primero eliminar políticas existentes
DROP POLICY IF EXISTS "insertar pagos" ON pago_clientes;
DROP POLICY IF EXISTS "seleccionar pagos" ON pago_clientes;

-- Crear política simple para INSERT
CREATE POLICY "insertar pagos" ON pago_clientes
FOR INSERT 
TO public
WITH CHECK (true); -- Permitir inserción a todos los usuarios autenticados

-- Crear política simple para SELECT
CREATE POLICY "seleccionar pagos" ON pago_clientes
FOR SELECT 
TO public
USING (true); -- Permitir ver todos los registros

-- Verificar que se crearon las políticas
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'pago_clientes';
