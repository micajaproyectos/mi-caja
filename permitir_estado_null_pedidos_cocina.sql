-- ============================================
-- Permitir NULL solo en: estado y hora_termino
-- Mesa y hora_inicio SIEMPRE se llenan (necesarias para agrupar)
-- ============================================

-- Permitir NULL en estado (solo primera fila del pedido)
ALTER TABLE pedidos_cocina 
ALTER COLUMN estado DROP NOT NULL;

-- Quitar DEFAULT de estado
ALTER TABLE pedidos_cocina 
ALTER COLUMN estado DROP DEFAULT;

-- hora_termino ya permite NULL por defecto

-- Limpiar datos existentes
TRUNCATE TABLE pedidos_cocina;

-- Verificar
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pedidos_cocina' 
AND column_name IN ('mesa', 'hora_inicio_pedido', 'hora_termino', 'estado')
ORDER BY column_name;

