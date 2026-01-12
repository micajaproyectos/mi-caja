-- ============================================
-- Script para crear la tabla 'cierre_caja' en Supabase
-- Almacena los cierres de jornada (Mañana/Tarde) del RegistroVenta
-- ============================================

-- 1. Crear la tabla cierre_caja
CREATE TABLE IF NOT EXISTS public.cierre_caja (
    -- Identificación
    id BIGSERIAL PRIMARY KEY,
    
    -- Referencias (igual que otras tablas)
    usuario_id UUID DEFAULT auth.uid() NOT NULL,
    cliente_id UUID,
    
    -- Fecha del cierre
    fecha DATE NOT NULL,
    
    -- Jornada: 'manana' o 'tarde'
    jornada TEXT NOT NULL CHECK (jornada IN ('manana', 'tarde')),
    
    -- Valores verificados físicamente (ingresados manualmente)
    efectivo_verificado NUMERIC(12,2) NOT NULL DEFAULT 0,
    debito_verificado NUMERIC(12,2) NOT NULL DEFAULT 0,
    credito_verificado NUMERIC(12,2) NOT NULL DEFAULT 0,
    transferencia_verificada NUMERIC(12,2) NOT NULL DEFAULT 0,
    caja_inicial_verificada NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Valores registrados en el sistema (del resumen de ventas)
    efectivo_registrado NUMERIC(12,2) NOT NULL DEFAULT 0,
    debito_registrado NUMERIC(12,2) NOT NULL DEFAULT 0,
    credito_registrado NUMERIC(12,2) NOT NULL DEFAULT 0,
    transferencia_registrada NUMERIC(12,2) NOT NULL DEFAULT 0,
    caja_inicial_registrada NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Totales verificados (calculados)
    total_ventas_verificado NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_en_caja_verificado NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Totales registrados (calculados)
    total_ventas_registrado NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_en_caja_registrado NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cierre_caja_usuario ON public.cierre_caja(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cierre_caja_fecha ON public.cierre_caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cierre_caja_jornada ON public.cierre_caja(jornada);
CREATE INDEX IF NOT EXISTS idx_cierre_caja_fecha_jornada ON public.cierre_caja(fecha, jornada);
CREATE INDEX IF NOT EXISTS idx_cierre_caja_usuario_fecha ON public.cierre_caja(usuario_id, fecha DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.cierre_caja ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS (solo el usuario puede ver/editar sus propios cierres)
-- Política para SELECT (leer)
CREATE POLICY "usuarios_pueden_ver_sus_cierre_caja" 
    ON public.cierre_caja
    FOR SELECT 
    USING (auth.uid() = usuario_id);

-- Política para INSERT (insertar)
CREATE POLICY "usuarios_pueden_insertar_sus_cierre_caja" 
    ON public.cierre_caja
    FOR INSERT 
    WITH CHECK (auth.uid() = usuario_id);

-- Política para UPDATE (actualizar)
CREATE POLICY "usuarios_pueden_actualizar_sus_cierre_caja" 
    ON public.cierre_caja
    FOR UPDATE 
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Política para DELETE (eliminar)
CREATE POLICY "usuarios_pueden_eliminar_sus_cierre_caja" 
    ON public.cierre_caja
    FOR DELETE 
    USING (auth.uid() = usuario_id);

-- 5. Crear función para actualizar updated_at automáticamente (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_cierre_caja_updated_at ON public.cierre_caja;
CREATE TRIGGER update_cierre_caja_updated_at 
    BEFORE UPDATE ON public.cierre_caja 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Comentarios en la tabla y columnas (opcional pero útil)
COMMENT ON TABLE public.cierre_caja IS 'Registra los cierres de caja por jornada (Mañana/Tarde)';
COMMENT ON COLUMN public.cierre_caja.fecha IS 'Fecha del cierre de jornada';
COMMENT ON COLUMN public.cierre_caja.jornada IS 'Jornada: manana o tarde';
COMMENT ON COLUMN public.cierre_caja.efectivo_verificado IS 'Efectivo verificado físicamente';
COMMENT ON COLUMN public.cierre_caja.efectivo_registrado IS 'Efectivo registrado en el sistema (del resumen de ventas)';
COMMENT ON COLUMN public.cierre_caja.total_ventas_verificado IS 'Suma de todos los tipos de pago verificados + caja inicial';
COMMENT ON COLUMN public.cierre_caja.total_en_caja_verificado IS 'Efectivo verificado + Caja inicial verificada';

-- 8. Verificar la estructura de la tabla
SELECT 
    column_name as nombre_columna,
    data_type as tipo_dato,
    is_nullable as permite_null,
    column_default as valor_por_defecto
FROM information_schema.columns 
WHERE table_name = 'cierre_caja' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. Verificar las políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'cierre_caja';
