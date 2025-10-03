-- Script para crear la tabla 'ventas_rapidas' en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla ventas_rapidas
CREATE TABLE IF NOT EXISTS public.ventas_rapidas (
    id BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_cl DATE NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('efectivo', 'debito', 'credito', 'transferencia')),
    usuario_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ventas_rapidas_fecha_cl ON public.ventas_rapidas(fecha_cl);
CREATE INDEX IF NOT EXISTS idx_ventas_rapidas_usuario ON public.ventas_rapidas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_rapidas_cliente ON public.ventas_rapidas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_rapidas_tipo_pago ON public.ventas_rapidas(tipo_pago);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.ventas_rapidas ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad RLS

-- Política para SELECT (leer) - Los usuarios pueden ver solo sus propias ventas rápidas
CREATE POLICY "Usuarios pueden ver sus propias ventas rápidas" ON public.ventas_rapidas
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.usuario_id = auth.uid() 
            AND u.cliente_id = ventas_rapidas.cliente_id
        )
    );

-- Política para INSERT (insertar) - Los usuarios pueden insertar solo sus propias ventas rápidas
CREATE POLICY "Usuarios pueden insertar sus propias ventas rápidas" ON public.ventas_rapidas
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.usuario_id = auth.uid() 
            AND u.cliente_id = ventas_rapidas.cliente_id
            AND u.usuario_id = ventas_rapidas.usuario_id
        )
    );

-- Política para UPDATE (actualizar) - Solo admin puede modificar sus propias ventas rápidas
CREATE POLICY "Solo admin puede modificar sus propias ventas rápidas" ON public.ventas_rapidas
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.usuario_id = auth.uid() 
            AND u.cliente_id = ventas_rapidas.cliente_id
            AND u.rol = 'admin'
        )
    );

-- Política para DELETE (eliminar) - Solo admin puede eliminar sus propias ventas rápidas
CREATE POLICY "Solo admin puede eliminar sus propias ventas rápidas" ON public.ventas_rapidas
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.usuario_id = auth.uid() 
            AND u.cliente_id = ventas_rapidas.cliente_id
            AND u.rol = 'admin'
        )
    );

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_ventas_rapidas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_ventas_rapidas_updated_at_trigger ON public.ventas_rapidas;
CREATE TRIGGER update_ventas_rapidas_updated_at_trigger 
    BEFORE UPDATE ON public.ventas_rapidas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_ventas_rapidas_updated_at();

-- 7. Comentarios para documentación
COMMENT ON TABLE public.ventas_rapidas IS 'Tabla para registrar ventas rápidas sin inventario';
COMMENT ON COLUMN public.ventas_rapidas.fecha IS 'Fecha y hora de la venta (timestamp con zona horaria)';
COMMENT ON COLUMN public.ventas_rapidas.fecha_cl IS 'Fecha de la venta en formato local chileno (solo fecha)';
COMMENT ON COLUMN public.ventas_rapidas.monto IS 'Monto total de la venta rápida';
COMMENT ON COLUMN public.ventas_rapidas.tipo_pago IS 'Tipo de pago: efectivo, debito, credito, transferencia';
COMMENT ON COLUMN public.ventas_rapidas.usuario_id IS 'ID del usuario que registró la venta';
COMMENT ON COLUMN public.ventas_rapidas.cliente_id IS 'ID del cliente al que pertenece el usuario';

