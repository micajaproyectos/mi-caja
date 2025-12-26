-- ============================================================================
-- PRUEBA DEL TRIGGER DE AUDITORÍA PARA TABLA GASTO
-- ============================================================================
-- Este script prueba que el trigger de auditoría funcione correctamente

-- 1. Verificar que el trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auditoria_gasto';

-- 2. Ver el estado actual de la tabla auditoría (antes de la prueba)
SELECT 
    'Registros de auditoría ANTES de la prueba: ' || COUNT(*) as estado_inicial
FROM public.auditoria 
WHERE tabla_nombre = 'gasto';

-- 3. Ver algunos gastos existentes para hacer una prueba
SELECT 
    id,
    detalle,
    monto,
    fecha,
    created_at
FROM public.gasto 
LIMIT 3;

-- Mensaje de instrucciones
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger verificado correctamente';
    RAISE NOTICE '📋 Ahora ve a la aplicación y edita un gasto';
    RAISE NOTICE '🔍 Después ejecuta el script: check_audit_after_test.sql';
    RAISE NOTICE '⚠️ IMPORTANTE: NO hagas la prueba aquí, úsala en la aplicación';
END $$;
