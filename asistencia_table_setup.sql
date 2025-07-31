-- Configuración de tablas para el sistema de asistencia
-- Ejecutar en Supabase SQL Editor

-- Tabla de empleados
CREATE TABLE IF NOT EXISTS empleados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    fecha_contratacion DATE DEFAULT CURRENT_DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asistencias
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_id ON asistencias(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_fecha ON asistencias(empleado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en empleados
CREATE TRIGGER update_empleados_updated_at 
    BEFORE UPDATE ON empleados 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- Políticas para empleados (permitir lectura y escritura para todos los usuarios autenticados)
CREATE POLICY "Permitir acceso completo a empleados" ON empleados
    FOR ALL USING (true);

-- Políticas para asistencias (permitir lectura y escritura para todos los usuarios autenticados)
CREATE POLICY "Permitir acceso completo a asistencias" ON asistencias
    FOR ALL USING (true);

-- Datos de ejemplo para empleados
INSERT INTO empleados (nombre, apellido, cargo, email, telefono) VALUES
('Juan', 'Pérez', 'Vendedor', 'juan.perez@empresa.com', '+1234567890'),
('María', 'García', 'Cajero', 'maria.garcia@empresa.com', '+1234567891'),
('Carlos', 'López', 'Supervisor', 'carlos.lopez@empresa.com', '+1234567892'),
('Ana', 'Martínez', 'Vendedor', 'ana.martinez@empresa.com', '+1234567893'),
('Luis', 'Rodríguez', 'Cajero', 'luis.rodriguez@empresa.com', '+1234567894')
ON CONFLICT DO NOTHING;

-- Vista para estadísticas de asistencia
CREATE OR REPLACE VIEW estadisticas_asistencia AS
SELECT 
    e.id as empleado_id,
    e.nombre,
    e.apellido,
    e.cargo,
    COUNT(CASE WHEN a.tipo = 'entrada' THEN 1 END) as total_entradas,
    COUNT(CASE WHEN a.tipo = 'salida' THEN 1 END) as total_salidas,
    COUNT(*) as total_registros
FROM empleados e
LEFT JOIN asistencias a ON e.id = a.empleado_id
WHERE e.activo = true
GROUP BY e.id, e.nombre, e.apellido, e.cargo;

-- Comentarios para documentación
COMMENT ON TABLE empleados IS 'Tabla que almacena la información de los empleados';
COMMENT ON TABLE asistencias IS 'Tabla que registra las entradas y salidas de los empleados';
COMMENT ON VIEW estadisticas_asistencia IS 'Vista que proporciona estadísticas de asistencia por empleado'; 