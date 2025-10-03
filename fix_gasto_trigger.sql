-- ============================================================================
-- CORREGIR TRIGGER DE AUDITORÍA PARA TABLA GASTO
-- ============================================================================
-- El problema es que el campo id en gasto es numérico, no UUID

-- Eliminar el trigger actual
DROP TRIGGER IF EXISTS trigger_auditoria_gasto ON public.gasto;
DROP FUNCTION IF EXISTS public.fn_auditoria_gasto_trigger();

-- Función corregida para auditoría de gastos (con id numérico)
CREATE OR REPLACE FUNCTION public.fn_auditoria_gasto_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_registro_id_numerico BIGINT;
BEGIN
    -- Obtener el usuario_id de la sesión actual
    v_usuario_id := auth.uid();
    
    -- Obtener el registro_id (ahora como BIGINT)
    IF (TG_OP = 'DELETE') THEN
        v_registro_id_numerico := OLD.id;
        
        -- Insertar registro de auditoría para DELETE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,  -- NULL para gastos
            registro_id,  -- NULL para gastos (usamos registro_id_numerico)
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'DELETE',
            v_usuario_id,
            NULL,  -- gastos no tienen cliente_id
            NULL,  -- gastos usan BIGINT, no UUID
            v_registro_id_numerico,
            row_to_json(OLD)::JSONB,
            NULL,
            NOW()
        );
        
        RETURN OLD;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        v_registro_id_numerico := NEW.id;
        
        -- Insertar registro de auditoría para UPDATE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,  -- NULL para gastos
            registro_id,  -- NULL para gastos (usamos registro_id_numerico)
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'UPDATE',
            v_usuario_id,
            NULL,  -- gastos no tienen cliente_id
            NULL,  -- gastos usan BIGINT, no UUID
            v_registro_id_numerico,
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB,
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger corregido
CREATE TRIGGER trigger_auditoria_gasto
    AFTER UPDATE OR DELETE ON public.gasto
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_gasto_trigger();

COMMENT ON TRIGGER trigger_auditoria_gasto ON public.gasto IS 'Trigger corregido de auditoría para tabla gasto (id numérico)';
COMMENT ON FUNCTION public.fn_auditoria_gasto_trigger() IS 'Función corregida de auditoría para gastos con id numérico';

-- Verificar que se creó correctamente
SELECT 
    'Trigger corregido: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ' 
        ELSE 'NO' 
    END as resultado
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auditoria_gasto';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger corregido para tabla gasto';
    RAISE NOTICE '🔧 Ahora maneja correctamente IDs numéricos';
    RAISE NOTICE '📋 Ejecuta test_gasto_audit.sql nuevamente para probar';
END $$;
