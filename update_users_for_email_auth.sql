-- Actualizar tabla usuarios para autenticación por correo electrónico
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar estructura actual de la tabla usuarios
SELECT '=== ESTRUCTURA ACTUAL ===' as seccion;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- 2. Agregar columna email si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 3. Verificar estructura actualizada
SELECT '=== ESTRUCTURA ACTUALIZADA ===' as seccion;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- 4. Verificar usuarios existentes
SELECT '=== USUARIOS EXISTENTES ===' as seccion;
SELECT usuario_id, nombre, rol, cliente_id, email FROM usuarios ORDER BY nombre;

-- 5. Instrucciones para crear usuarios con autenticación real
SELECT '=== INSTRUCCIONES PARA CREAR USUARIOS ===' as seccion;
SELECT 'Para crear usuarios con autenticación real:' as instruccion;
SELECT '1. Usar la función signUp del authService' as paso1;
SELECT '2. O crear manualmente en Supabase Auth y luego insertar en tabla usuarios' as paso2;

-- 6. Ejemplo de inserción manual (comentar si no se necesita)
-- INSERT INTO usuarios (usuario_id, nombre, rol, cliente_id, email) VALUES
-- ('UUID-GENERADO-POR-SUPABASE-AUTH', 'Micaja', 'admin', 'UUID-GENERADO-POR-SUPABASE-AUTH', 'micaja@micaja.com'),
-- ('UUID-GENERADO-POR-SUPABASE-AUTH', 'Loshermanos', 'usuario', 'UUID-GENERADO-POR-SUPABASE-AUTH', 'loshermanos@micaja.com'),
-- ('UUID-GENERADO-POR-SUPABASE-AUTH', 'Lostoro', 'usuario', 'UUID-GENERADO-POR-SUPABASE-AUTH', 'lostoro@micaja.com'),
-- ('UUID-GENERADO-POR-SUPABASE-AUTH', 'Emanuel', 'usuario', 'UUID-GENERADO-POR-SUPABASE-AUTH', 'emanuel@micaja.com')
-- ON CONFLICT (email) DO NOTHING;

-- 7. Verificar políticas RLS
SELECT '=== POLÍTICAS RLS ===' as seccion;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- 8. Crear políticas RLS para la tabla usuarios si no existen
-- Los usuarios solo pueden ver y modificar sus propios datos
CREATE POLICY IF NOT EXISTS "Usuarios pueden ver sus propios datos" ON usuarios
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "Usuarios pueden insertar sus propios datos" ON usuarios
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY IF NOT EXISTS "Usuarios pueden actualizar sus propios datos" ON usuarios
    FOR UPDATE USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- Solo administradores pueden eliminar usuarios
CREATE POLICY IF NOT EXISTS "Solo admin puede eliminar usuarios" ON usuarios
    FOR DELETE USING (
        auth.uid() = usuario_id AND 
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.usuario_id = auth.uid() 
            AND usuarios.rol = 'admin'
        )
    );

-- 9. Verificar políticas finales
SELECT '=== POLÍTICAS RLS FINALES ===' as seccion;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname; 