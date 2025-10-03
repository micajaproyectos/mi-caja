-- ============================================================================
-- CORREGIR TRIGGER DE AUDITORÍA PARA TABLA VENTA_RAPIDA
-- ============================================================================
-- El problema es que el campo id en venta_rapida es numérico, no UUID

-- Eliminar el trigger actual de venta_rapida
DROP TRIGGER IF EXISTS trigger_auditoria_venta_rapida ON public.venta_rapida;

-- Función específica para auditoría de venta_rapida (con id numérico)
CREATE OR REPLACE FUNCTION public.fn_auditoria_venta_rapida_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_cliente_id UUID;
    v_registro_id_numerico BIGINT;
BEGIN
    -- Obtener el usuario_id de la sesión actual
    v_usuario_id := auth.uid();
    
    -- Obtener cliente_id si existe
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            v_cliente_id := OLD.cliente_id;
        ELSE
            v_cliente_id := NEW.cliente_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_cliente_id := NULL;
    END;
    
    -- Obtener el registro_id (como BIGINT)
    IF (TG_OP = 'DELETE') THEN
        v_registro_id_numerico := OLD.id;
        
        -- Insertar registro de auditoría para DELETE
        INSERT INTO public.auditoria (
            tabla_nombre,
            accion,
            usuario_id,
            cliente_id,
            registro_id,  -- NULL para venta_rapida (usamos registro_id_numerico)
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'DELETE',
            v_usuario_id,
            v_cliente_id,
            NULL,  -- venta_rapida usa BIGINT, no UUID
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
            cliente_id,
            registro_id,  -- NULL para venta_rapida (usamos registro_id_numerico)
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'UPDATE',
            v_usuario_id,
            v_cliente_id,
            NULL,  -- venta_rapida usa BIGINT, no UUID
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

-- Crear el trigger corregido para venta_rapida
CREATE TRIGGER trigger_auditoria_venta_rapida
    AFTER UPDATE OR DELETE ON public.venta_rapida
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_venta_rapida_trigger();

COMMENT ON TRIGGER trigger_auditoria_venta_rapida ON public.venta_rapida IS 'Trigger corregido de auditoría para tabla venta_rapida (id numérico)';
COMMENT ON FUNCTION public.fn_auditoria_venta_rapida_trigger() IS 'Función específica de auditoría para venta_rapida con id numérico';

-- Verificar que se creó correctamente
SELECT 
    'Trigger corregido para venta_rapida: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ' 
        ELSE 'NO' 
    END as resultado
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auditoria_venta_rapida';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger corregido para tabla venta_rapida';
    RAISE NOTICE '🔧 Ahora maneja correctamente IDs numéricos';
    RAISE NOTICE '📋 Puedes editar y eliminar ventas rápidas sin problemas';
END $$;
