-- ============================================
-- REVERTIR: Volver a guardar hora de Santiago
-- (Aunque sea técnicamente incorrecto, muestra la hora local correcta)
-- ============================================

ALTER TABLE pedidos_cocina 
ALTER COLUMN hora_inicio_pedido SET DEFAULT (NOW() AT TIME ZONE 'America/Santiago');

-- Limpiar datos con hora UTC
TRUNCATE TABLE pedidos_cocina;

-- Verificar
SELECT 
    column_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pedidos_cocina' 
AND column_name = 'hora_inicio_pedido';

