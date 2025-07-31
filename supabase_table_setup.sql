-- Script para crear la tabla 'ventas' en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla ventas si no existe
CREATE TABLE IF NOT EXISTS public.ventas (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo_pago TEXT NOT NULL,
    producto TEXT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    unidad TEXT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total_venta DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON public.ventas(producto);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo_pago ON public.ventas(tipo_pago);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad para permitir operaciones anónimas
-- Política para SELECT (leer)
CREATE POLICY "Permitir lectura anónima de ventas" ON public.ventas
    FOR SELECT USING (true);

-- Política para INSERT (insertar)
CREATE POLICY "Permitir inserción anónima de ventas" ON public.ventas
    FOR INSERT WITH CHECK (true);

-- Política para UPDATE (actualizar)
CREATE POLICY "Permitir actualización anónima de ventas" ON public.ventas
    FOR UPDATE USING (true);

-- Política para DELETE (eliminar)
CREATE POLICY "Permitir eliminación anónima de ventas" ON public.ventas
    FOR DELETE USING (true);

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear trigger para actualizar updated_at
CREATE TRIGGER update_ventas_updated_at 
    BEFORE UPDATE ON public.ventas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insertar datos de prueba (opcional)
INSERT INTO public.ventas (fecha, tipo_pago, producto, cantidad, unidad, precio_unitario, total_venta) VALUES
('2024-01-15', 'efectivo', 'Manzana Roja', 2.5, 'Kg', 1250.00, 3125.00),
('2024-01-15', 'debito', 'Palta Hass', 1.0, 'Kg', 3500.00, 3500.00),
('2024-01-16', 'transferencia', 'Zanahoria', 3.0, 'Kg', 800.00, 2400.00);

-- 8. Verificar la estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ventas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. Verificar las políticas RLS
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
WHERE tablename = 'ventas';