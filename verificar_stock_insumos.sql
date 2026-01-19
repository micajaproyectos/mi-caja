-- ========================================
-- PASO 1: Verificar estructura actual
-- ========================================

-- Ver estructura de compras_insumos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compras_insumos'
ORDER BY ordinal_position;

-- Ver algunas compras de ejemplo
SELECT *
FROM compras_insumos
ORDER BY fecha_hora DESC
LIMIT 5;
