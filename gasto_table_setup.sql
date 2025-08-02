-- Script para crear la tabla 'gasto' en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla gasto si no existe
CREATE TABLE IF NOT EXISTS public.gasto (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo_gasto TEXT NOT NULL CHECK (tipo_gasto IN ('Fijo', 'Variable')),
    detalle TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('Efectivo', 'Débito', 'Transferencia')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_gasto_fecha ON public.gasto(fecha);
CREATE INDEX IF NOT EXISTS idx_gasto_tipo_gasto ON public.gasto(tipo_gasto);
CREATE INDEX IF NOT EXISTS idx_gasto_tipo_pago ON public.gasto(tipo_pago);
CREATE INDEX IF NOT EXISTS idx_gasto_created_at ON public.gasto(created_at);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.gasto ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad para permitir operaciones anónimas
-- Política para SELECT (leer)
CREATE POLICY "Permitir lectura anónima de gastos" ON public.gasto
    FOR SELECT USING (true);

-- Política para INSERT (insertar)
CREATE POLICY "Permitir inserción anónima de gastos" ON public.gasto
    FOR INSERT WITH CHECK (true);

-- Política para UPDATE (actualizar)
CREATE POLICY "Permitir actualización anónima de gastos" ON public.gasto
    FOR UPDATE USING (true);

-- Política para DELETE (eliminar)
CREATE POLICY "Permitir eliminación anónima de gastos" ON public.gasto
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
CREATE TRIGGER update_gasto_updated_at 
    BEFORE UPDATE ON public.gasto 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insertar datos de prueba (opcional)
INSERT INTO public.gasto (fecha, tipo_gasto, detalle, monto, tipo_pago) VALUES
('2024-01-15', 'Fijo', 'Alquiler local', 500000, 'Transferencia'),
('2024-01-16', 'Variable', 'Compra de insumos', 150000, 'Débito'),
('2024-01-17', 'Fijo', 'Servicios básicos', 75000, 'Efectivo'),
('2024-01-18', 'Variable', 'Mantenimiento equipos', 250000, 'Transferencia'),
('2024-01-19', 'Fijo', 'Seguros', 120000, 'Débito');

-- 8. Verificar la estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gasto' 
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
WHERE tablename = 'gasto';

-- 10. Verificar los datos insertados
SELECT 
    id,
    fecha,
    tipo_gasto,
    detalle,
    monto,
    tipo_pago,
    created_at
FROM public.gasto
ORDER BY fecha DESC; 