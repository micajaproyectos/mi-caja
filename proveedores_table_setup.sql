-- Script para crear la tabla proveedores en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nombre_proveedor TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
    estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'Pagado')) DEFAULT 'Pendiente',
    fecha_pago DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_proveedores_fecha ON proveedores(fecha);
CREATE INDEX IF NOT EXISTS idx_proveedores_estado ON proveedores(estado);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre_proveedor);
CREATE INDEX IF NOT EXISTS idx_proveedores_created_at ON proveedores(created_at);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_proveedores_updated_at 
    BEFORE UPDATE ON proveedores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Configurar RLS (Row Level Security) - opcional
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones (ajustar según necesidades)
CREATE POLICY "Permitir todas las operaciones en proveedores" ON proveedores
    FOR ALL USING (true);

-- Insertar algunos datos de ejemplo (opcional)
INSERT INTO proveedores (nombre_proveedor, monto, estado) VALUES
    ('Proveedor Ejemplo 1', 150000, 'Pendiente'),
    ('Proveedor Ejemplo 2', 75000, 'Pagado'),
    ('Proveedor Ejemplo 3', 250000, 'Pendiente')
ON CONFLICT DO NOTHING;

-- Comentarios sobre la estructura:
-- - id: Identificador único autoincremental
-- - fecha: Fecha del registro (se asigna automáticamente la fecha actual)
-- - nombre_proveedor: Nombre del proveedor (texto obligatorio)
-- - monto: Monto del pago (decimal con 2 decimales, debe ser >= 0)
-- - estado: Estado del pago ('Pendiente' o 'Pagado', por defecto 'Pendiente')
-- - created_at: Timestamp de creación del registro
-- - updated_at: Timestamp de última actualización (se actualiza automáticamente) 