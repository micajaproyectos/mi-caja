-- =====================================================
-- TABLA PARA SINCRONIZAR CONFIGURACIÓN DE MESAS
-- =====================================================
-- Esta tabla guarda las mesas de cada usuario (nombres y orden)
-- para que se sincronicen entre todos los dispositivos

-- 1. Crear la tabla mesas_config
CREATE TABLE IF NOT EXISTS public.mesas_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    nombre_mesa TEXT NOT NULL,
    orden INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    UNIQUE(usuario_id, nombre_mesa), -- No permitir mesas duplicadas por usuario
    UNIQUE(usuario_id, orden) -- No permitir mismo orden para el mismo usuario
);

-- 2. Agregar foreign keys
ALTER TABLE public.mesas_config
ADD CONSTRAINT mesas_config_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mesas_config
ADD CONSTRAINT mesas_config_cliente_id_fkey 
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS mesas_config_usuario_id_idx ON public.mesas_config(usuario_id);
CREATE INDEX IF NOT EXISTS mesas_config_orden_idx ON public.mesas_config(usuario_id, orden);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.mesas_config ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS (usuarios solo pueden ver/editar sus propias mesas)

-- SELECT: Usuarios pueden ver sus propias mesas
CREATE POLICY "Usuarios pueden ver sus propias mesas"
ON public.mesas_config
FOR SELECT
TO public
USING (auth.uid() = usuario_id);

-- INSERT: Usuarios pueden crear sus propias mesas
CREATE POLICY "Usuarios pueden crear sus propias mesas"
ON public.mesas_config
FOR INSERT
TO public
WITH CHECK (auth.uid() = usuario_id);

-- UPDATE: Usuarios pueden actualizar sus propias mesas
CREATE POLICY "Usuarios pueden actualizar sus propias mesas"
ON public.mesas_config
FOR UPDATE
TO public
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- DELETE: Usuarios pueden eliminar sus propias mesas
CREATE POLICY "Usuarios pueden eliminar sus propias mesas"
ON public.mesas_config
FOR DELETE
TO public
USING (auth.uid() = usuario_id);

-- 6. Habilitar Realtime para sincronización automática
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas_config;

-- 7. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_mesas_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para updated_at
CREATE TRIGGER update_mesas_config_updated_at_trigger
BEFORE UPDATE ON public.mesas_config
FOR EACH ROW
EXECUTE FUNCTION update_mesas_config_updated_at();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mesas_config'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'mesas_config';

