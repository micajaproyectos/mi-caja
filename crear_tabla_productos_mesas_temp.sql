-- ============================================================
-- TABLA: productos_mesas_temp
-- ============================================================
-- Almacena productos temporales agregados a las mesas
-- Se sincroniza en tiempo real entre dispositivos del mismo usuario

CREATE TABLE IF NOT EXISTS productos_mesas_temp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL,
    mesa TEXT NOT NULL,
    producto TEXT NOT NULL,
    cantidad TEXT NOT NULL,
    unidad TEXT NOT NULL,
    precio_unitario NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    comentarios TEXT,
    producto_id BIGINT NOT NULL, -- ID temporal del producto en el frontend
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_productos_mesas_usuario 
ON productos_mesas_temp(usuario_id);

CREATE INDEX IF NOT EXISTS idx_productos_mesas_cliente 
ON productos_mesas_temp(cliente_id);

CREATE INDEX IF NOT EXISTS idx_productos_mesas_mesa 
ON productos_mesas_temp(mesa);

CREATE INDEX IF NOT EXISTS idx_productos_mesas_usuario_mesa 
ON productos_mesas_temp(usuario_id, mesa);

-- ============================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS
ALTER TABLE productos_mesas_temp ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Solo ver productos de mesas del mismo usuario
CREATE POLICY "Usuarios pueden ver sus propias mesas temporales"
ON productos_mesas_temp
FOR SELECT
USING (
    auth.uid() = usuario_id
);

-- Política INSERT: Solo insertar productos en mesas propias
CREATE POLICY "Usuarios pueden insertar en sus propias mesas temporales"
ON productos_mesas_temp
FOR INSERT
WITH CHECK (
    auth.uid() = usuario_id
);

-- Política UPDATE: Solo actualizar productos de mesas propias
CREATE POLICY "Usuarios pueden actualizar sus propias mesas temporales"
ON productos_mesas_temp
FOR UPDATE
USING (
    auth.uid() = usuario_id
)
WITH CHECK (
    auth.uid() = usuario_id
);

-- Política DELETE: Solo eliminar productos de mesas propias
CREATE POLICY "Usuarios pueden eliminar de sus propias mesas temporales"
ON productos_mesas_temp
FOR DELETE
USING (
    auth.uid() = usuario_id
);

-- ============================================================
-- HABILITAR REALTIME
-- ============================================================

-- Habilitar Realtime para la tabla (para sincronización entre dispositivos)
ALTER PUBLICATION supabase_realtime ADD TABLE productos_mesas_temp;

-- ============================================================
-- PERMISOS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON productos_mesas_temp TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON productos_mesas_temp TO anon;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'productos_mesas_temp'
ORDER BY ordinal_position;

-- Verificar políticas RLS
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
WHERE tablename = 'productos_mesas_temp';

-- ============================================================
-- FUNCIONES AUXILIARES (OPCIONAL)
-- ============================================================

-- Función para limpiar mesas temporales antiguas (más de 24 horas sin actividad)
CREATE OR REPLACE FUNCTION limpiar_mesas_temporales_antiguas()
RETURNS void AS $$
BEGIN
    DELETE FROM productos_mesas_temp
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE 'Mesas temporales antiguas limpiadas';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar manualmente cuando sea necesario:
-- SELECT limpiar_mesas_temporales_antiguas();

-- O programar con pg_cron si está disponible:
-- SELECT cron.schedule(
--     'limpiar-mesas-temporales',
--     '0 3 * * *', -- 3 AM diario
--     $$SELECT limpiar_mesas_temporales_antiguas()$$
-- );

