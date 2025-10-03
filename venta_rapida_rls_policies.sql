-- Script para crear políticas RLS en la tabla 'venta_rapida' existente
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Habilitar Row Level Security (RLS) en la tabla
ALTER TABLE public.venta_rapida ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes si las hay (opcional)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias ventas rápidas" ON public.venta_rapida;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias ventas rápidas" ON public.venta_rapida;
DROP POLICY IF EXISTS "Solo admin puede modificar sus propias ventas rápidas" ON public.venta_rapida;
DROP POLICY IF EXISTS "Solo admin puede eliminar sus propias ventas rápidas" ON public.venta_rapida;

-- 3. Crear políticas RLS

-- Política para SELECT (leer) - Los usuarios pueden ver solo sus propias ventas rápidas
CREATE POLICY "Usuarios pueden ver sus propias ventas rápidas" ON public.venta_rapida
    FOR SELECT 
    USING (
        usuario_id = auth.uid()
    );

-- Política para INSERT (insertar) - Los usuarios pueden insertar solo sus propias ventas rápidas
CREATE POLICY "Usuarios pueden insertar sus propias ventas rápidas" ON public.venta_rapida
    FOR INSERT 
    WITH CHECK (
        usuario_id = auth.uid()
    );

-- Política para UPDATE (actualizar) - Solo admin puede modificar sus propias ventas rápidas
CREATE POLICY "Solo admin puede modificar sus propias ventas rápidas" ON public.venta_rapida
    FOR UPDATE 
    USING (
        usuario_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.usuario_id = auth.uid() 
            AND u.rol = 'admin'
        )
    );

-- Política para DELETE (eliminar) - Solo admin puede eliminar sus propias ventas rápidas
CREATE POLICY "Solo admin puede eliminar sus propias ventas rápidas" ON public.venta_rapida
    FOR DELETE 
    USING (
        usuario_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.usuario_id = auth.uid() 
            AND u.rol = 'admin'
        )
    );

-- 4. Verificar que las políticas se crearon correctamente
-- Ejecuta esta consulta para ver las políticas activas:
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
WHERE tablename = 'venta_rapida'
ORDER BY policyname;

