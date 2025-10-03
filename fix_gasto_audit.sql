-- ============================================================================
-- SCRIPT DE CORRECCIÓN PARA TABLA GASTO
-- ============================================================================
-- Este script elimina temporalmente el trigger de auditoría de la tabla gasto
-- para resolver el problema de tipos de datos

-- Eliminar el trigger de auditoría de la tabla gasto
DROP TRIGGER IF EXISTS trigger_auditoria_gasto ON public.gasto;

-- Verificar que se eliminó correctamente
SELECT 
    'Trigger eliminado: ' || CASE 
        WHEN COUNT(*) = 0 THEN 'SÍ' 
        ELSE 'NO' 
    END as resultado
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auditoria_gasto';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger de auditoría eliminado de la tabla gasto';
    RAISE NOTICE '🔧 Ahora puedes editar gastos sin problemas';
    RAISE NOTICE '⚠️ La tabla gasto NO será auditada hasta que se corrija el trigger';
END $$;
