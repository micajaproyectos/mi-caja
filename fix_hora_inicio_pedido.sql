-- ============================================
-- FIX: Corregir DEFAULT de hora_inicio_pedido
-- Problema: Guarda hora de Santiago como si fuera UTC
-- Solución: Usar NOW() directamente (siempre retorna UTC correcto)
-- ============================================

-- Eliminar el DEFAULT incorrecto y poner el correcto
ALTER TABLE pedidos_cocina 
ALTER COLUMN hora_inicio_pedido SET DEFAULT NOW();

-- ============================================
-- OPCIONAL: Limpiar datos existentes si quieres
-- (Si prefieres mantener los pedidos actuales, no ejecutes esto)
-- ============================================

-- TRUNCATE TABLE pedidos_cocina;

-- ============================================
-- VERIFICACIÓN: Probar que ahora guarda UTC correcto
-- ============================================

-- Ver el DEFAULT actualizado
SELECT 
    column_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pedidos_cocina' 
AND column_name = 'hora_inicio_pedido';

-- Comparar NOW() vs el DEFAULT anterior
SELECT 
    NOW() as utc_correcto,
    NOW() AT TIME ZONE 'America/Santiago' as santiago_incorrecto;

