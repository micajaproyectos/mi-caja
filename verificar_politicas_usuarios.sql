-- =====================================================
-- VERIFICAR Y CORREGIR POLÍTICAS RLS DE LA TABLA USUARIOS
-- =====================================================

-- 1. Ver las políticas actuales de la tabla usuarios
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
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- 2. ELIMINAR políticas existentes si están mal configuradas
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.usuarios;

-- 3. CREAR política correcta para SELECT (lectura)
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON public.usuarios
FOR SELECT
TO public
USING (
    auth.uid() = usuario_id
);

-- 4. CREAR política para UPDATE (actualización - opcional)
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
ON public.usuarios
FOR UPDATE
TO public
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- 5. Verificar que RLS esté habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'usuarios';

-- Si rowsecurity = false, ejecutar:
-- ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 6. Verificar que la política se creó correctamente
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usuarios';

