-- ============================================
-- Restaurar DEFAULT en hora_inicio_pedido
-- ============================================

-- Agregar DEFAULT a hora_inicio_pedido (hora de Santiago)
ALTER TABLE pedidos_cocina 
ALTER COLUMN hora_inicio_pedido SET DEFAULT (NOW() AT TIME ZONE 'America/Santiago');

-- Limpiar datos
TRUNCATE TABLE pedidos_cocina;

-- Verificar
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pedidos_cocina' 
AND column_name = 'hora_inicio_pedido';

