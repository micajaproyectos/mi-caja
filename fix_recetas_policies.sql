-- Script para corregir las políticas RLS de la tabla recetas
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Eliminar políticas existentes que están causando problemas
DROP POLICY IF EXISTS "Usuarios pueden ver sus recetas" ON recetas;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus recetas" ON recetas;
DROP POLICY IF EXISTS "Solo admin puede modificar sus recetas" ON recetas;
DROP POLICY IF EXISTS "Solo admin puede eliminar sus recetas" ON recetas;

-- 2. Crear políticas más simples que funcionen con auth.users directamente
-- Política para SELECT (leer) - Usuarios pueden ver sus propias recetas
CREATE POLICY "Usuarios pueden ver sus recetas" ON recetas
    FOR SELECT USING (auth.uid() = usuario_id);

-- Política para INSERT (insertar) - Usuarios pueden insertar sus recetas
CREATE POLICY "Usuarios pueden insertar sus recetas" ON recetas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Política para UPDATE (actualizar) - Solo el creador puede modificar
CREATE POLICY "Solo creador puede modificar sus recetas" ON recetas
    FOR UPDATE USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Política para DELETE (eliminar) - Solo el creador puede eliminar
CREATE POLICY "Solo creador puede eliminar sus recetas" ON recetas
    FOR DELETE USING (auth.uid() = usuario_id);

-- 3. Verificar que las políticas se crearon correctamente
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'recetas'
ORDER BY policyname;
