-- Script para corregir las políticas RLS de la tabla transporte
-- Ejecuta este script si ya creaste la tabla y tienes problemas con RLS

-- 1. Eliminar políticas antiguas
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Usuarios pueden modificar sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Solo admin puede eliminar sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios transportes" ON public.transporte;

-- 2. Crear nuevas políticas simplificadas

-- Política para SELECT (leer)
CREATE POLICY "Usuarios pueden ver sus propios transportes" ON public.transporte
    FOR SELECT 
    USING (usuario_id = auth.uid());

-- Política para INSERT (insertar)
CREATE POLICY "Usuarios pueden insertar sus propios transportes" ON public.transporte
    FOR INSERT 
    WITH CHECK (usuario_id = auth.uid());

-- Política para UPDATE (actualizar)
CREATE POLICY "Usuarios pueden modificar sus propios transportes" ON public.transporte
    FOR UPDATE 
    USING (usuario_id = auth.uid());

-- Política para DELETE (eliminar)
CREATE POLICY "Usuarios pueden eliminar sus propios transportes" ON public.transporte
    FOR DELETE 
    USING (usuario_id = auth.uid());

-- 3. Verificar las políticas actualizadas
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
WHERE tablename = 'transporte';

