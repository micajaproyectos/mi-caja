-- Configuración de tabla asistencia actualizada
-- Ejecutar en Supabase SQL Editor

-- La tabla asistencia ya existe, solo agregamos/modificamos campos necesarios

-- Agregar campos si no existen
DO $$ 
BEGIN
    -- Agregar campo hora_entrada si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asistencia' AND column_name = 'hora_entrada') THEN
        ALTER TABLE asistencia ADD COLUMN hora_entrada TIME;
    END IF;
    
    -- Agregar campo hora_salida si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asistencia' AND column_name = 'hora_salida') THEN
        ALTER TABLE asistencia ADD COLUMN hora_salida TIME;
    END IF;
    
    -- Agregar campo total_horas si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asistencia' AND column_name = 'total_horas') THEN
        ALTER TABLE asistencia ADD COLUMN total_horas VARCHAR(10);
    END IF;
    
    -- Agregar campo updated_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asistencia' AND column_name = 'updated_at') THEN
        ALTER TABLE asistencia ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Índices para mejorar el rendimiento (solo si no existen)
CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_empleado_fecha ON asistencia(empleado, fecha);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_asistencia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en asistencia
CREATE TRIGGER update_asistencia_updated_at 
    BEFORE UPDATE ON asistencia 
    FOR EACH ROW 
    EXECUTE FUNCTION update_asistencia_updated_at();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;

-- Políticas para asistencia (permitir lectura y escritura para todos los usuarios autenticados)
CREATE POLICY "Permitir acceso completo a asistencia" ON asistencia
    FOR ALL USING (true);

-- Vista para estadísticas de asistencia actualizada
CREATE OR REPLACE VIEW estadisticas_asistencia AS
SELECT 
    a.empleado,
    COUNT(CASE WHEN a.hora_entrada IS NOT NULL THEN 1 END) as total_entradas,
    COUNT(CASE WHEN a.hora_salida IS NOT NULL THEN 1 END) as total_salidas,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN a.hora_entrada IS NOT NULL AND a.hora_salida IS NOT NULL THEN 1 END) as registros_completos
FROM asistencia a
GROUP BY a.empleado;

-- Vista principal para mostrar registros de asistencia
CREATE OR REPLACE VIEW vista_asistencia AS
SELECT 
    id,
    empleado,
    fecha,
    hora_entrada,
    hora_salida,
    total_horas,
    created_at,
    updated_at,
    CASE 
        WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL THEN 'Completo'
        WHEN hora_entrada IS NOT NULL THEN 'Solo Entrada'
        ELSE 'Sin Registro'
    END as estado
FROM asistencia
ORDER BY fecha DESC, hora_entrada DESC;

-- Función para calcular total de horas automáticamente
CREATE OR REPLACE FUNCTION calcular_total_horas()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo calcular si hay hora de entrada y salida
    IF NEW.hora_entrada IS NOT NULL AND NEW.hora_salida IS NOT NULL THEN
        -- Convertir horas a minutos
        DECLARE
            minutos_entrada INTEGER;
            minutos_salida INTEGER;
            diferencia_minutos INTEGER;
            horas INTEGER;
            minutos INTEGER;
        BEGIN
            minutos_entrada := EXTRACT(HOUR FROM NEW.hora_entrada) * 60 + EXTRACT(MINUTE FROM NEW.hora_entrada);
            minutos_salida := EXTRACT(HOUR FROM NEW.hora_salida) * 60 + EXTRACT(MINUTE FROM NEW.hora_salida);
            
            diferencia_minutos := minutos_salida - minutos_entrada;
            
            -- Solo calcular si la salida es posterior a la entrada
            IF diferencia_minutos >= 0 THEN
                horas := diferencia_minutos / 60;
                minutos := diferencia_minutos % 60;
                NEW.total_horas := LPAD(horas::TEXT, 2, '0') || ':' || LPAD(minutos::TEXT, 2, '0');
            ELSE
                NEW.total_horas := NULL;
            END IF;
        END;
    ELSE
        NEW.total_horas := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular total_horas automáticamente
CREATE TRIGGER trigger_calcular_total_horas
    BEFORE INSERT OR UPDATE ON asistencia
    FOR EACH ROW
    EXECUTE FUNCTION calcular_total_horas();

-- Comentarios para documentación
COMMENT ON TABLE asistencia IS 'Tabla que registra las entradas y salidas de los empleados con cálculo automático de horas';
COMMENT ON VIEW estadisticas_asistencia IS 'Vista que proporciona estadísticas de asistencia por empleado';
COMMENT ON VIEW vista_asistencia IS 'Vista principal para mostrar registros de asistencia con estado calculado';
COMMENT ON FUNCTION calcular_total_horas() IS 'Función que calcula automáticamente el total de horas trabajadas'; 