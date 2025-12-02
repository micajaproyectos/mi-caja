-- ============================================
-- Script completo para configurar la tabla transporte
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- PASO 1: Eliminar tabla si existe (CUIDADO: esto borra todos los datos)
-- Descomenta la siguiente línea solo si quieres empezar desde cero
-- DROP TABLE IF EXISTS public.transporte CASCADE;

-- PASO 2: Crear la tabla transporte
CREATE TABLE IF NOT EXISTS public.transporte (
    id BIGSERIAL PRIMARY KEY,
    fecha_entrega DATE NOT NULL,
    destino TEXT NOT NULL,
    nombre_entrega TEXT NOT NULL,
    nombre_retira TEXT NOT NULL,
    tipo_carga TEXT NOT NULL CHECK (tipo_carga IN ('Bultos', 'Kg', 'Unidades')),
    cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
    comentarios TEXT,
    estado TEXT NOT NULL CHECK (estado IN ('en_transito', 'entregado')) DEFAULT 'en_transito',
    fecha_hora_entrega TIMESTAMP WITH TIME ZONE NULL,
    nombre_retiro TEXT NULL,
    usuario_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.transporte.fecha_hora_entrega IS 
'Fecha y hora real en que se entregó la carga (Santiago, Chile). Se registra automáticamente cuando el estado cambia a entregado';
COMMENT ON COLUMN public.transporte.nombre_retiro IS 
'Nombre de quien REALMENTE retiró la carga al momento de la entrega. Se captura mediante popup al cambiar estado a entregado';

-- PASO 3: Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_transporte_fecha_entrega ON public.transporte(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_transporte_usuario ON public.transporte(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transporte_cliente ON public.transporte(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transporte_estado ON public.transporte(estado);
CREATE INDEX IF NOT EXISTS idx_transporte_tipo_carga ON public.transporte(tipo_carga);

-- PASO 4: Habilitar Row Level Security (RLS)
ALTER TABLE public.transporte ENABLE ROW LEVEL SECURITY;

-- PASO 5: Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Usuarios pueden modificar sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios transportes" ON public.transporte;
DROP POLICY IF EXISTS "Solo admin puede eliminar sus propios transportes" ON public.transporte;

-- PASO 6: Crear políticas de seguridad RLS

-- Política para SELECT (leer)
CREATE POLICY "Usuarios pueden ver sus propios transportes" 
ON public.transporte 
FOR SELECT 
USING (auth.uid() = usuario_id);

-- Política para INSERT (insertar)
CREATE POLICY "Usuarios pueden insertar sus propios transportes" 
ON public.transporte 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

-- Política para UPDATE (actualizar)
CREATE POLICY "Usuarios pueden modificar sus propios transportes" 
ON public.transporte 
FOR UPDATE 
USING (auth.uid() = usuario_id);

-- Política para DELETE (eliminar)
CREATE POLICY "Usuarios pueden eliminar sus propios transportes" 
ON public.transporte 
FOR DELETE 
USING (auth.uid() = usuario_id);

-- PASO 7: Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_transporte_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PASO 8: Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_transporte_updated_at_trigger ON public.transporte;
CREATE TRIGGER update_transporte_updated_at_trigger 
    BEFORE UPDATE ON public.transporte 
    FOR EACH ROW 
    EXECUTE FUNCTION update_transporte_updated_at();

-- PASO 9: Comentarios para documentación
COMMENT ON TABLE public.transporte IS 'Tabla para registrar entregas de transporte y encomiendas';
COMMENT ON COLUMN public.transporte.fecha_entrega IS 'Fecha de la entrega';
COMMENT ON COLUMN public.transporte.destino IS 'Destino de la carga';
COMMENT ON COLUMN public.transporte.nombre_entrega IS 'Nombre de quien entrega la carga';
COMMENT ON COLUMN public.transporte.nombre_retira IS 'Nombre de quien retira la carga';
COMMENT ON COLUMN public.transporte.tipo_carga IS 'Tipo de carga: Bultos, Kg, o Unidades';
COMMENT ON COLUMN public.transporte.cantidad IS 'Cantidad de carga según el tipo';
COMMENT ON COLUMN public.transporte.comentarios IS 'Comentarios adicionales sobre la carga';
COMMENT ON COLUMN public.transporte.estado IS 'Estado de la entrega: en_transito o entregado';
COMMENT ON COLUMN public.transporte.usuario_id IS 'ID del usuario que registró el transporte (UUID de Supabase Auth)';
COMMENT ON COLUMN public.transporte.cliente_id IS 'ID del cliente al que pertenece el usuario';

-- ============================================
-- VERIFICACIONES
-- ============================================

-- Verificar la estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transporte' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar las políticas RLS
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

-- Verificar que RLS esté habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'transporte';

-- ============================================
-- PRUEBA DE INSERCIÓN (Opcional - para debugging)
-- ============================================
-- Descomenta estas líneas para insertar un registro de prueba
-- NOTA: Reemplaza 'tu-usuario-uuid' con tu UUID real de auth.users

/*
INSERT INTO public.transporte (
    fecha_entrega,
    destino,
    nombre_entrega,
    nombre_retira,
    tipo_carga,
    cantidad,
    comentarios,
    estado,
    usuario_id,
    cliente_id
) VALUES (
    CURRENT_DATE,
    'Santiago',
    'Juan Pérez',
    'María González',
    'Bultos',
    5,
    'Prueba de inserción',
    'en_transito',
    auth.uid(), -- Esto usa el usuario actualmente autenticado
    auth.uid()  -- Mismo valor para cliente_id
);
*/

-- ============================================
-- FIN DEL SCRIPT
-- Tabla transporte configurada correctamente
-- ============================================

