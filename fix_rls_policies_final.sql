-- Corregir políticas RLS para usar usuario_id en lugar de id
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar las políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver solo sus propias ventas" ON ventas;
DROP POLICY IF EXISTS "Usuarios pueden insertar solo sus propias ventas" ON ventas;
DROP POLICY IF EXISTS "Solo admin puede modificar sus propias ventas" ON ventas;
DROP POLICY IF EXISTS "Solo admin puede eliminar sus propias ventas" ON ventas;

-- Crear nuevas políticas que usen usuario_id correctamente
-- 1. Política SELECT - Ver solo mis ventas
CREATE POLICY "Usuarios pueden ver solo sus propias ventas" ON ventas
FOR SELECT USING (
  auth.uid() = usuario_id
);

-- 2. Política INSERT - Solo puedo insertar ventas con mi propio usuario_id
CREATE POLICY "Usuarios pueden insertar solo sus propias ventas" ON ventas
FOR INSERT WITH CHECK (
  auth.uid() = usuario_id
);

-- 3. Política UPDATE - Solo admin puede modificar sus propias ventas
CREATE POLICY "Solo admin puede modificar sus propias ventas" ON ventas
FOR UPDATE USING (
  auth.uid() = usuario_id
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.usuario_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
) WITH CHECK (
  auth.uid() = usuario_id
);

-- 4. Política DELETE - Solo admin puede eliminar sus propias ventas
CREATE POLICY "Solo admin puede eliminar sus propias ventas" ON ventas
FOR DELETE USING (
  auth.uid() = usuario_id
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.usuario_id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Verificar las políticas corregidas
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ventas'
ORDER BY policyname; 