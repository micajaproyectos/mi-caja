-- ============================================================================
-- TRIGGER ESPECÍFICO PARA TABLA GASTO
-- ============================================================================
-- Este script crea un trigger de auditoría específico para la tabla gasto
-- que maneja correctamente su estructura sin campo cliente_id

-- Función específica para auditoría de gastos
CREATE OR REPLACE FUNCTION public.fn_auditoria_gasto_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_registro_id UUID;
BEGIN
    -- Obtener el usuario_id de la sesión actual
    v_usuario_id := auth.uid();
    
    -- Obtener el registro_id (asumimos que es UUID)
    IF (TG_OP = 'DELETE') THEN
        v_registro_id := OLD.id;
        
        -- Insertar registro de auditoría para DELETE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,  -- NULL para gastos
            registro_id,
            registro_id_numerico,  -- NULL para gastos
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'DELETE',
            v_usuario_id,
            NULL,  -- gastos no tienen cliente_id
            v_registro_id,
            NULL,  -- gastos usan UUID, no BIGINT
            row_to_json(OLD)::JSONB,
            NULL,
            NOW()
        );
        
        RETURN OLD;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        v_registro_id := NEW.id;
        
        -- Insertar registro de auditoría para UPDATE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,  -- NULL para gastos
            registro_id,
            registro_id_numerico,  -- NULL para gastos
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'UPDATE',
            v_usuario_id,
            NULL,  -- gastos no tienen cliente_id
            v_registro_id,
            NULL,  -- gastos usan UUID, no BIGINT
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB,
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger específico para gastos
DROP TRIGGER IF EXISTS trigger_auditoria_gasto ON public.gasto;
CREATE TRIGGER trigger_auditoria_gasto
    AFTER UPDATE OR DELETE ON public.gasto
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_gasto_trigger();

COMMENT ON TRIGGER trigger_auditoria_gasto ON public.gasto IS 'Trigger específico de auditoría para tabla gasto (sin cliente_id)';
COMMENT ON FUNCTION public.fn_auditoria_gasto_trigger() IS 'Función específica de auditoría para gastos que maneja la ausencia de cliente_id';

-- Verificar que se creó correctamente
SELECT 
    'Trigger creado: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ' 
        ELSE 'NO' 
    END as resultado
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auditoria_gasto';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger específico creado para tabla gasto';
    RAISE NOTICE '🔍 Funciones de auditoría: fn_auditoria_gasto_trigger()';
    RAISE NOTICE '📋 Tabla gasto ahora está monitoreada correctamente';
    RAISE NOTICE '⚠️ cliente_id se maneja como NULL para gastos';
END $$;
