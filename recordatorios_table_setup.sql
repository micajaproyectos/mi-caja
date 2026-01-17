-- ============================================
-- TABLA DE RECORDATORIOS PARA CALENDARIO
-- Mi Caja - Sistema de Alarmas
-- ============================================

-- 1. Crear la tabla recordatorios
CREATE TABLE IF NOT EXISTS public.recordatorios (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Campos de fecha/hora
    dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
    mes INTEGER NOT NULL CHECK (mes >= 0 AND mes <= 11), -- 0-11 (JavaScript months)
    anio INTEGER NOT NULL CHECK (anio >= 2024),
    fecha TEXT NOT NULL, -- Formato: "DD/MM/YYYY"
    hora TEXT NOT NULL, -- Formato: "HH:MM"
    
    -- Campos del recordatorio
    asunto TEXT NOT NULL CHECK (char_length(asunto) > 0),
    prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'ejecutado')),
    
    -- Campos de auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índice para mejorar búsquedas
    CONSTRAINT recordatorios_fecha_check CHECK (char_length(fecha) > 0),
    CONSTRAINT recordatorios_hora_check CHECK (char_length(hora) > 0)
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_recordatorios_usuario_id ON public.recordatorios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON public.recordatorios(anio, mes, dia);
CREATE INDEX IF NOT EXISTS idx_recordatorios_estado ON public.recordatorios(estado);
CREATE INDEX IF NOT EXISTS idx_recordatorios_usuario_estado ON public.recordatorios(usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_recordatorios_usuario_fecha ON public.recordatorios(usuario_id, anio, mes, dia);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad (RLS Policies)

-- Política SELECT: Los usuarios solo pueden ver sus propios recordatorios
CREATE POLICY "Los usuarios pueden ver sus propios recordatorios"
    ON public.recordatorios
    FOR SELECT
    USING (auth.uid() = usuario_id);

-- Política INSERT: Los usuarios solo pueden crear recordatorios para sí mismos
CREATE POLICY "Los usuarios pueden crear sus propios recordatorios"
    ON public.recordatorios
    FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- Política UPDATE: Los usuarios solo pueden actualizar sus propios recordatorios
CREATE POLICY "Los usuarios pueden actualizar sus propios recordatorios"
    ON public.recordatorios
    FOR UPDATE
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Política DELETE: Los usuarios solo pueden eliminar sus propios recordatorios
CREATE POLICY "Los usuarios pueden eliminar sus propios recordatorios"
    ON public.recordatorios
    FOR DELETE
    USING (auth.uid() = usuario_id);

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_recordatorios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_recordatorios_updated_at ON public.recordatorios;
CREATE TRIGGER trigger_update_recordatorios_updated_at
    BEFORE UPDATE ON public.recordatorios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_recordatorios_updated_at();

-- 7. Comentarios en la tabla y columnas (documentación)
COMMENT ON TABLE public.recordatorios IS 'Tabla de recordatorios/alarmas del calendario de Mi Caja';
COMMENT ON COLUMN public.recordatorios.id IS 'ID único del recordatorio';
COMMENT ON COLUMN public.recordatorios.usuario_id IS 'ID del usuario que creó el recordatorio';
COMMENT ON COLUMN public.recordatorios.dia IS 'Día del mes (1-31)';
COMMENT ON COLUMN public.recordatorios.mes IS 'Mes del año (0-11, formato JavaScript)';
COMMENT ON COLUMN public.recordatorios.anio IS 'Año (YYYY)';
COMMENT ON COLUMN public.recordatorios.fecha IS 'Fecha en formato DD/MM/YYYY';
COMMENT ON COLUMN public.recordatorios.hora IS 'Hora en formato HH:MM';
COMMENT ON COLUMN public.recordatorios.asunto IS 'Descripción del recordatorio';
COMMENT ON COLUMN public.recordatorios.prioridad IS 'Prioridad: baja, media o alta';
COMMENT ON COLUMN public.recordatorios.estado IS 'Estado: pendiente o ejecutado';
COMMENT ON COLUMN public.recordatorios.created_at IS 'Fecha de creación del recordatorio';
COMMENT ON COLUMN public.recordatorios.updated_at IS 'Fecha de última actualización';

-- 8. Verificar que todo se creó correctamente
DO $$
BEGIN
    -- Verificar tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordatorios') THEN
        RAISE NOTICE '✅ Tabla recordatorios creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Tabla recordatorios no se creó';
    END IF;
    
    -- Verificar RLS habilitado
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'recordatorios' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS habilitado en tabla recordatorios';
    ELSE
        RAISE EXCEPTION '❌ Error: RLS no está habilitado';
    END IF;
    
    -- Verificar políticas
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'recordatorios') >= 4 THEN
        RAISE NOTICE '✅ Políticas RLS creadas correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Faltan políticas RLS';
    END IF;
    
    -- Verificar índices
    IF (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'recordatorios') >= 5 THEN
        RAISE NOTICE '✅ Índices creados correctamente';
    ELSE
        RAISE WARNING '⚠️  Advertencia: Algunos índices podrían no haberse creado';
    END IF;
    
    RAISE NOTICE '🎉 Setup de tabla recordatorios completado exitosamente';
END $$;
