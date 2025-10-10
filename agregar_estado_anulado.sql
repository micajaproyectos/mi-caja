-- ============================================
-- Agregar estado "anulado" a la columna estado
-- ============================================

-- Eliminar el CHECK constraint actual
ALTER TABLE pedidos_cocina 
DROP CONSTRAINT IF EXISTS pedidos_cocina_estado_check;

-- Crear nuevo CHECK constraint con 3 estados: pendiente, terminado, anulado
ALTER TABLE pedidos_cocina 
ADD CONSTRAINT pedidos_cocina_estado_check 
CHECK (estado IN ('pendiente', 'terminado', 'anulado') OR estado IS NULL);

-- Verificar
SELECT 
    column_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pedidos_cocina' 
AND column_name = 'estado';

-- Ver el constraint actualizado
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'pedidos_cocina_estado_check';

