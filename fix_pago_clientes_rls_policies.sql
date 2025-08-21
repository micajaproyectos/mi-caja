-- Script para corregir las políticas RLS de la tabla pago_clientes
-- Este script debe ejecutarse en Supabase SQL Editor

-- 1. Primero, habilitar RLS en la tabla pago_clientes si no está habilitado
ALTER TABLE pago_clientes ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "insertar pagos" ON pago_clientes;
DROP POLICY IF EXISTS "seleccionar pagos" ON pago_clientes;
DROP POLICY IF EXISTS "actualizar pagos" ON pago_clientes;
DROP POLICY IF EXISTS "eliminar pagos" ON pago_clientes;

-- 3. Crear nueva política para INSERT (insertar registros de pago)
CREATE POLICY "insertar pagos" ON pago_clientes
FOR INSERT 
TO public
WITH CHECK (
  -- Permitir inserción si el usuario_id coincide con el usuario autenticado
  usuario_id = auth.uid()
);

-- 4. Crear política para SELECT (ver registros de pago)
CREATE POLICY "seleccionar pagos" ON pago_clientes
FOR SELECT 
TO public
USING (
  -- Permitir ver solo los registros del usuario autenticado
  usuario_id = auth.uid()
);

-- 5. Crear política para UPDATE (actualizar registros de pago)
CREATE POLICY "actualizar pagos" ON pago_clientes
FOR UPDATE 
TO public
USING (
  -- Permitir actualizar solo los registros del usuario autenticado
  usuario_id = auth.uid()
)
WITH CHECK (
  -- Verificar que el usuario_id siga siendo el mismo después de la actualización
  usuario_id = auth.uid()
);

-- 6. Crear política para DELETE (eliminar registros de pago)
CREATE POLICY "eliminar pagos" ON pago_clientes
FOR DELETE 
TO public
USING (
  -- Permitir eliminar solo los registros del usuario autenticado
  usuario_id = auth.uid()
);

-- 7. Verificar que las políticas se crearon correctamente
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
WHERE tablename = 'pago_clientes';

-- 8. Verificar la estructura de la tabla pago_clientes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pago_clientes'
ORDER BY ordinal_position;

-- 9. Comentario explicativo
-- Estas políticas RLS permiten que cada usuario:
-- - Inserte registros de pago solo con su propio usuario_id
-- - Vea solo sus propios registros de pago
-- - Actualice solo sus propios registros de pago
-- - Elimine solo sus propios registros de pago
--
-- La política de INSERT es la más importante para resolver el error actual
-- ya que permite que se inserten nuevos registros de pago siempre que
-- el usuario_id coincida con auth.uid()
