-- ============================================
-- TABLA DE ALERTAS DE STOCK BAJO
-- Mi Caja - Sistema de Alertas de Inventario
-- ============================================

-- 1. Crear la tabla alertas_stock_bajo
CREATE TABLE IF NOT EXISTS public.alertas_stock_bajo (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Estado de la alerta
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'aplazada', 'desactivada')),
    
    -- Información de aplazamiento
    aplazada_hasta TIMESTAMPTZ NULL, -- Fecha/hora hasta cuando está aplazada
    tipo_aplazamiento TEXT NULL CHECK (tipo_aplazamiento IN ('15min', '1hora', 'manana', NULL)),
    ultima_notificacion TIMESTAMPTZ NULL, -- Última vez que se mostró la alerta
    veces_aplazada INTEGER NOT NULL DEFAULT 0, -- Contador de veces que se ha aplazado
    
    -- Insumos críticos (JSON con array de insumos con stock bajo)
    insumos_criticos JSONB DEFAULT '[]'::jsonb,
    
    -- Campos de auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT aplazamiento_valido CHECK (
        (estado = 'aplazada' AND aplazada_hasta IS NOT NULL AND tipo_aplazamiento IS NOT NULL) OR
        (estado != 'aplazada')
    )
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_alertas_stock_usuario_id ON public.alertas_stock_bajo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_alertas_stock_estado ON public.alertas_stock_bajo(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_stock_aplazada_hasta ON public.alertas_stock_bajo(aplazada_hasta) 
    WHERE estado = 'aplazada';
CREATE INDEX IF NOT EXISTS idx_alertas_stock_usuario_estado ON public.alertas_stock_bajo(usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_alertas_stock_ultima_notif ON public.alertas_stock_bajo(ultima_notificacion);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.alertas_stock_bajo ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad (RLS Policies)

-- Política SELECT: Los usuarios solo pueden ver sus propias alertas
CREATE POLICY "Los usuarios pueden ver sus propias alertas de stock"
    ON public.alertas_stock_bajo
    FOR SELECT
    USING (auth.uid() = usuario_id);

-- Política INSERT: Los usuarios solo pueden crear alertas para sí mismos
CREATE POLICY "Los usuarios pueden crear sus propias alertas de stock"
    ON public.alertas_stock_bajo
    FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

-- Política UPDATE: Los usuarios solo pueden actualizar sus propias alertas
CREATE POLICY "Los usuarios pueden actualizar sus propias alertas de stock"
    ON public.alertas_stock_bajo
    FOR UPDATE
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Política DELETE: Los usuarios solo pueden eliminar sus propias alertas
CREATE POLICY "Los usuarios pueden eliminar sus propias alertas de stock"
    ON public.alertas_stock_bajo
    FOR DELETE
    USING (auth.uid() = usuario_id);

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_alertas_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_alertas_stock_updated_at ON public.alertas_stock_bajo;
CREATE TRIGGER trigger_update_alertas_stock_updated_at
    BEFORE UPDATE ON public.alertas_stock_bajo
    FOR EACH ROW
    EXECUTE FUNCTION public.update_alertas_stock_updated_at();

-- 7. Crear función helper para obtener alertas activas
CREATE OR REPLACE FUNCTION public.get_alerta_stock_activa(p_usuario_id UUID)
RETURNS SETOF public.alertas_stock_bajo AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.alertas_stock_bajo
    WHERE usuario_id = p_usuario_id
      AND (
          estado = 'activa' OR
          (estado = 'aplazada' AND aplazada_hasta <= NOW())
      )
    ORDER BY created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Comentarios en la tabla y columnas (documentación)
COMMENT ON TABLE public.alertas_stock_bajo IS 'Tabla de alertas de stock bajo para insumos críticos en Mi Caja';
COMMENT ON COLUMN public.alertas_stock_bajo.id IS 'ID único de la alerta';
COMMENT ON COLUMN public.alertas_stock_bajo.usuario_id IS 'ID del usuario que recibe la alerta';
COMMENT ON COLUMN public.alertas_stock_bajo.estado IS 'Estado de la alerta: activa, aplazada o desactivada';
COMMENT ON COLUMN public.alertas_stock_bajo.aplazada_hasta IS 'Fecha/hora hasta cuando está aplazada la alerta';
COMMENT ON COLUMN public.alertas_stock_bajo.tipo_aplazamiento IS 'Tipo de aplazamiento: 15min, 1hora, manana';
COMMENT ON COLUMN public.alertas_stock_bajo.ultima_notificacion IS 'Fecha/hora de la última vez que se mostró la alerta';
COMMENT ON COLUMN public.alertas_stock_bajo.veces_aplazada IS 'Contador de veces que el usuario ha aplazado la alerta';
COMMENT ON COLUMN public.alertas_stock_bajo.insumos_criticos IS 'Array JSON con los insumos que tienen stock bajo';
COMMENT ON COLUMN public.alertas_stock_bajo.created_at IS 'Fecha de creación de la alerta';
COMMENT ON COLUMN public.alertas_stock_bajo.updated_at IS 'Fecha de última actualización';

-- 9. Verificar que todo se creó correctamente
DO $$
BEGIN
    -- Verificar tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alertas_stock_bajo') THEN
        RAISE NOTICE '✅ Tabla alertas_stock_bajo creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Tabla alertas_stock_bajo no se creó';
    END IF;
    
    -- Verificar RLS habilitado 
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'alertas_stock_bajo' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS habilitado en tabla alertas_stock_bajo';
    ELSE
        RAISE EXCEPTION '❌ Error: RLS no está habilitado';
    END IF;
    
    -- Verificar políticas
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'alertas_stock_bajo') >= 4 THEN
        RAISE NOTICE '✅ Políticas RLS creadas correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Faltan políticas RLS';
    END IF;
    
    -- Verificar índices
    IF (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'alertas_stock_bajo') >= 5 THEN
        RAISE NOTICE '✅ Índices creados correctamente';
    ELSE
        RAISE WARNING '⚠️  Advertencia: Algunos índices podrían no haberse creado';
    END IF;
    
    -- Verificar función helper
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_alerta_stock_activa'
    ) THEN
        RAISE NOTICE '✅ Función helper get_alerta_stock_activa creada correctamente';
    ELSE
        RAISE WARNING '⚠️  Advertencia: Función helper no se creó';
    END IF;
    
    RAISE NOTICE '🎉 Setup de tabla alertas_stock_bajo completado exitosamente';
END $$;
