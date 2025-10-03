-- ============================================================================
-- CORREGIR TRIGGER DE AUDITORÍA PARA TABLA PEDIDOS
-- ============================================================================
-- El problema es que el campo id en pedidos es numérico, no UUID

-- Eliminar el trigger actual de pedidos
DROP TRIGGER IF EXISTS trigger_auditoria_pedidos ON public.pedidos;

-- Función específica para auditoría de pedidos (con id numérico)
CREATE OR REPLACE FUNCTION public.fn_auditoria_pedidos_trigger()
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
            registro_id,  -- NULL para pedidos (usamos registro_id_numerico)
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'DELETE',
            v_usuario_id,
            v_cliente_id,
            NULL,  -- pedidos usan BIGINT, no UUID
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
            registro_id,  -- NULL para pedidos (usamos registro_id_numerico)
            registro_id_numerico,
            datos_anteriores,
            datos_nuevos,
            fecha_hora
        ) VALUES (
            TG_TABLE_NAME,
            'UPDATE',
            v_usuario_id,
            v_cliente_id,
            NULL,  -- pedidos usan BIGINT, no UUID
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

-- Crear el trigger corregido para pedidos
CREATE TRIGGER trigger_auditoria_pedidos
    AFTER UPDATE OR DELETE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auditoria_pedidos_trigger();

COMMENT ON TRIGGER trigger_auditoria_pedidos ON public.pedidos IS 'Trigger corregido de auditoría para tabla pedidos (id numérico)';
COMMENT ON FUNCTION public.fn_auditoria_pedidos_trigger() IS 'Función específica de auditoría para pedidos con id numérico';

-- Verificar que se creó correctamente
SELECT 
    'Trigger corregido para pedidos: ' || CASE 
        WHEN COUNT(*) > 0 THEN 'SÍ' 
        ELSE 'NO' 
    END as resultado
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auditoria_pedidos';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger corregido para tabla pedidos';
    RAISE NOTICE '🔧 Ahora maneja correctamente IDs numéricos';
    RAISE NOTICE '📋 Puedes editar pedidos sin problemas';
END $$;
